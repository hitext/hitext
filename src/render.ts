import { resolveSpanHooksMap } from './span-hooks-map.js';
import { StringBuffer, createLineBoundaries, createNoProtoObject, defineProperties, fromEntries, functionOrValue, hasOwn, ownKeys } from './utils/index.js';
import type {
    LineBoundaries,
    GeneratedSpan,
    SpanHookContext,
    RenderHooks,
    SpanMarker,
    SpanHooksDefinitionMap,
    SpanHookText,
    RenderBuffer,
    SpanCallableHook
} from './types.js';

export function render<T, R = T, HC = unknown>(
    document: string,
    spans: GeneratedSpan[],
    spanHooksDefinitionMap: SpanHooksDefinitionMap<any, T, R, HC> | null = null,
    renderHooks: Partial<RenderHooks<T, R, HC>> = {},
    lineBoundaries: LineBoundaries | null = null
) {
    // Renderer output assembly methods
    const createBuffer = functionOrValue(renderHooks.createBuffer, () => new StringBuffer() as unknown as RenderBuffer<T, R>);
    const renderOpenHook = functionOrValue(renderHooks.open, null);
    const renderCloseHook = functionOrValue(renderHooks.close, null);
    const renderTextHook = functionOrValue(renderHooks.text, (documentChunk: string) => documentChunk);

    // Helper to append only non-empty content
    const appendToBuffer = (child: any) => {
        if ((child ?? '') !== '') { // Skip null/undefined/empty string
            currentBuffer.append(child);
        }
    };

    // Get hooks map from definitions
    const spanHooksMap = resolveSpanHooksMap(spanHooksDefinitionMap || {}, renderHooks);
    const spanMarkers = ownKeys(spanHooksMap);
    const spanPriority = new Map<string | symbol, number>(
        spanMarkers.map((marker, index) => [marker, index])
    );
    const spanWeight = new Map<string | symbol, number>(
        spanMarkers.map((marker) => [marker,
            (spanHooksMap[marker].break ? 2 : 0) +
            (spanHooksMap[marker].replace ? 1 : 0)
        ])
    );

    // Create hook context state
    const rootSpan: GeneratedSpan = {
        type: Symbol('root'),
        start: 0,
        end: document.length,
        data: undefined
    };
    let renderedOffset = 0;
    let segmentStart = 0;
    let segmentEnd = document.length;
    let currentSpanIndex = 0;
    let pointBoundaryOffset = -1;
    let lastPointIndex = -1;
    let currentSpanHook: SpanCallableHook = 'open';
    let currentSpan = rootSpan;

    const spanIndexMap = new Map<GeneratedSpan, number>();
    const spanHookContext: SpanHookContext<any, T, R> = defineProperties(createNoProtoObject(), {
        hook: { get: () => currentSpanHook },
        lines: { get: getLineBoundaries },
        document: { value: document },
        offset: { get: () => renderedOffset },
        line: { get: () => getLineBoundaries().getLine(renderedOffset) },
        column: { get: () => getLineBoundaries().getColumn(renderedOffset) },
        start: { get: () => segmentStart },
        end: { get: computeSegmentEnd },
        spanIndex: { get: getSpanIndex },
        spanText: { get: () => document.slice(currentSpan.start, currentSpan.end) },
        span: { get: () => currentSpan },
        data: { get: () => currentSpan.data },
        createBuffer: { value: createBuffer },
        dump: { value: () => fromEntries(ownKeys(spanHookContext)
            .map((key) => [key, (spanHookContext as any)[key]])
            .filter(key => key[0] !== 'dump' && key[0] !== 'lines' && key[0] !== 'createBuffer')
        ) }
    } satisfies Record<keyof SpanHookContext<any>, PropertyDescriptor>);

    // Track buffer nesting for spans with a wrap hook
    const bufferStack: ReturnType<typeof createBuffer>[] = [];
    let currentBuffer = createBuffer();

    // Track opened spans and their segment start offsets
    // spanStack follows materialized nesting: earlier layers are outer, then geometry within a layer.
    const spanStack: Array<GeneratedSpan> = [];
    const spanStackSegmentStarts: number[] = []; // Parallel array to spanStack
    const endStack: GeneratedSpan[] = [];
    let spanStackOpenIndex = 0;

    // Filter and sort spans (avoid input mutation)
    // Remove spans without hooks and invalid spans upfront
    spans = spans
        .filter(span =>
            hasOwn(spanHooksMap, span.type) &&
            span.start <= span.end &&
            Number.isInteger(span.start) &&
            Number.isInteger(span.end)
        )
        .sort(
            (a, b) =>
                a.start - b.start ||
                getStartPriority(a) - getStartPriority(b) ||
                spanWeight.get(toSpanMarkerKey(b.type))! - spanWeight.get(toSpanMarkerKey(a.type))! ||
                compareSpanNesting(a, b)
        );
    // Call renderer open hook
    setRootContext('open');
    appendToBuffer(renderOpenHook?.(spanHookContext));

    for (; currentSpanIndex < spans.length; currentSpanIndex++) {
        const span = spans[currentSpanIndex];
        const hook = spanHooksMap[span.type];
        const replaceMode = Boolean(hook.replace);
        const breakFlag = hook.break === true;

        if (span.start === span.end) {
            if (pointBoundaryOffset !== span.start) {
                pointBoundaryOffset = span.start;
                lastPointIndex = currentSpanIndex;
                for (let i = currentSpanIndex + 1; i < spans.length && spans[i].start === span.start; i++) {
                    if (spans[i].start === spans[i].end) {
                        lastPointIndex = i;
                    }
                }
            }
            closeSpanSegments(span.start, false, false);
            if (hook.point !== null || hasDifferentMarker(span)) {
                handlePointSpan(span);
                continue;
            }
        }

        // Close any spans that end before the new span starts
        closeSpanSegments(span.start);

        // Close any spans that end before the new span ends in replace mode
        if (replaceMode) {
            closeSpanSegments(span.end, true);
        }

        // Find the new span's layer-ordered nesting position.
        while (spanStackOpenIndex > 0) {
            const parentSpan = spanStack[spanStackOpenIndex - 1];

            // Earlier layers are outer. Within one layer, preserve geometric nesting.
            if ((!breakFlag || spanHooksMap[parentSpan.type].break) && compareSpanNesting(parentSpan, span) <= 0) {
                break;
            }

            // Temporarily close any spans that were opened after this one
            // to maintain correct nesting order
            spanStackOpenIndex--;
            closeSpanSegment(spanStack[spanStackOpenIndex], spanStackSegmentStarts[spanStackOpenIndex]);
        }

        if (!replaceMode) {
            // Normal flow: insert new span
            insertActiveSpan(span, spanStackOpenIndex);
        } else {
            handleReplaceSpan(span);
        }

        // Reopen spans that were closed to insert new span
        reopenSpanSegments();

    }

    closeSpanSegments(document.length);

    // Close spans that end out of document boundaries
    while (spanStackOpenIndex > 0) {
        spanStackOpenIndex--;
        closeSpanSegment(spanStack[spanStackOpenIndex], document.length);
    }

    // Finish rendering - call renderer close hook
    setRootContext('close');
    appendToBuffer(renderCloseHook?.(spanHookContext));

    // Final output
    return currentBuffer.emit();

    //
    // Handlers
    //

    function getLineBoundaries() {
        return lineBoundaries || (lineBoundaries = createLineBoundaries(document));
    }

    function toSpanMarkerKey(marker: SpanMarker): string | symbol {
        return typeof marker === 'number' ? String(marker) : marker;
    }

    function getSpanPriority(span: GeneratedSpan) {
        const hooks = spanHooksMap[span.type];

        if (span.start === span.end) {
            if (hooks.point === 'outside' || hooks.break) {
                return -1;
            }
            if (hooks.point === 'inside') {
                return spanMarkers.length;
            }
        }

        return spanPriority.get(toSpanMarkerKey(span.type))!;
    }

    function getStartPriority(span: GeneratedSpan) {
        return spanHooksMap[span.type].break ? -2 : getSpanPriority(span);
    }

    function compareSpanNesting(a: GeneratedSpan, b: GeneratedSpan): number {
        const aMarker = toSpanMarkerKey(a.type);
        const bMarker = toSpanMarkerKey(b.type);
        const aHasPointOverride = a.start === a.end && (spanHooksMap[a.type].point !== null || spanHooksMap[a.type].break);
        const bHasPointOverride = b.start === b.end && (spanHooksMap[b.type].point !== null || spanHooksMap[b.type].break);
        if (aMarker === bMarker && !aHasPointOverride && !bHasPointOverride) {
            return b.end - a.end;
        }

        const aPriority = getSpanPriority(a);
        const bPriority = getSpanPriority(b);

        const aHooks = spanHooksMap[a.type];
        const bHooks = spanHooksMap[b.type];
        const breakDifference = Number(bHooks.break) - Number(aHooks.break);
        const priorityDifference = aPriority - bPriority;

        return breakDifference || priorityDifference || b.end - a.end;
    }

    function setRootContext(hook: SpanCallableHook) {
        currentSpanHook = hook;
        currentSpan = rootSpan;
        segmentStart = 0;
        segmentEnd = document.length;
    }

    function getSpanIndex(): number {
        if (currentSpan === rootSpan) {
            return -1;
        }

        let spanIndex = spanIndexMap.get(currentSpan);

        if (spanIndex === undefined) {
            spanIndexMap.set(currentSpan, spanIndex = spanIndexMap.size);
        }

        return spanIndex;
    }

    function computeSegmentEnd() {
        // Lazy computation: if segmentEnd is -1, compute it
        if (segmentEnd !== -1) {
            return segmentEnd;
        }

        // The segment end is determined by the next event:
        // - The current span's natural end
        // - Or a new span starts that will cause interruption (has greater end than current span)
        // - Or a replace/break span that will close the current span early
        segmentEnd = currentSpan.end;

        const currentStackIndex = spanStack.indexOf(currentSpan);
        for (let i = 0; i < currentStackIndex; i++) {
            segmentEnd = Math.min(segmentEnd, spanStack[i].end);
        }

        // Find next span's start that comes after renderedOffset
        // and will be inserted outside the current span
        for (let i = currentSpanIndex + 1; i < spans.length; i++) {
            const nextSpan = spans[i];

            if (nextSpan.start < segmentEnd) {
                const nextSpanHooks = spanHooksMap[nextSpan.type];
                const isBreakSpan =
                    // Break flag closes all opened spans at nextSpan.start
                    nextSpanHooks.break ||
                    // Replace flag closes spans that end at or before nextSpan.end
                    (nextSpanHooks.replace && currentSpan.end <= nextSpan.end) ||
                    // Earlier layers and same-layer outer spans interrupt inner segments
                    compareSpanNesting(nextSpan, currentSpan) < 0;

                if (isBreakSpan) {
                    segmentEnd = nextSpan.start;
                    break;
                }
            }
        }

        return segmentEnd;
    }

    function openSpanSegment(span: GeneratedSpan, spanSegmentEnd: number) {
        const spanHooks = spanHooksMap[span.type];

        // Set current span for context
        currentSpan = span;

        // For open hook: start is the current offset, end is computed lazily
        segmentStart = renderedOffset;
        segmentEnd = spanSegmentEnd;

        // Call open hook (goes to current buffer)
        if (spanHooks.open) {
            currentSpanHook = 'open';
            appendToBuffer(spanHooks.open(spanHookContext));
        }

        // Create new buffer for accumulating content
        if (spanHooks.wrap) {
            bufferStack.push(currentBuffer);
            currentBuffer = createBuffer();
        }

        // Inject replace content if applicable
        if (spanHooks.replace) {
            currentSpanHook = 'replace';
            appendToBuffer(spanHooks.replace(spanHookContext));
        }
    }

    function closeSpanSegment(span: GeneratedSpan, spanSegmentStart: number) {
        const spanHooks = spanHooksMap[span.type];

        // Set current span for context
        currentSpan = span;

        // Set segment boundaries
        segmentStart = spanSegmentStart;
        segmentEnd = renderedOffset;

        if (spanHooks.wrap) {
            // Get accumulated content and restore parent buffer
            const content = currentBuffer.emit();
            currentBuffer = bufferStack.pop()!;

            // Emit wrapped accumulated content
            currentSpanHook = 'wrap';
            appendToBuffer(spanHooks.wrap(content, spanHookContext));
        }

        // Call close hook (goes to current buffer)
        if (spanHooks.close) {
            currentSpanHook = 'close';
            appendToBuffer(spanHooks.close(spanHookContext));
        }
    };

    function renderText(offset: number) {
        if (renderedOffset === offset) {
            return;
        }

        // Find the text hook by walking up the stack of opened spans
        // to inherit text transformation from parent spans
        let textHook: SpanHookText<any, T, R> = renderTextHook;
        let textHookSpan = rootSpan;
        for (let i = spanStackOpenIndex - 1; i >= 0; i--) {
            const spanTextHook = spanHooksMap[spanStack[i].type].text;
            if (spanTextHook !== null) {
                textHook = spanTextHook;
                textHookSpan = spanStack[i];
                break;
            }
        }

        // Append to current buffer
        const substring = document.slice(renderedOffset, offset);
        currentSpanHook = 'text';
        currentSpan = textHookSpan;
        segmentStart = renderedOffset;
        segmentEnd = offset;
        appendToBuffer(textHook(substring, spanHookContext));

        renderedOffset = offset;
    }

    function closeSpanSegments(offset: number, replaceMode: boolean = false, includeBoundary: boolean = true) {
        while (endStack.length > 0) {
            const nextEnd = endStack[endStack.length - 1].end;
            if (includeBoundary ? nextEnd > offset : nextEnd >= offset) {
                break;
            }

            if (!replaceMode) {
                renderText(nextEnd);
            }

            if (!replaceMode && endStack[endStack.length - 1] === spanStack[spanStackOpenIndex - 1]) {
                endStack.pop();
                spanStackOpenIndex--;
                closeSpanSegment(spanStack.pop()!, spanStackSegmentStarts.pop()!);
                continue;
            }

            const removeThrough = replaceMode ? offset : nextEnd;
            while (endStack[endStack.length - 1]?.end <= removeThrough) {
                const span = endStack.pop()!;
                const index = spanStack.indexOf(span);
                while (spanStackOpenIndex > index) {
                    spanStackOpenIndex--;
                    closeSpanSegment(spanStack[spanStackOpenIndex], spanStackSegmentStarts[spanStackOpenIndex]);
                }
                spanStack.splice(index, 1);
                spanStackSegmentStarts.splice(index, 1);
            }
            reopenSpanSegments();
        }

        if (!replaceMode) {
            renderText(offset);
        }
    }

    function reopenSpanSegments() {
        for (; spanStackOpenIndex < spanStack.length; spanStackOpenIndex++) {
            openSpanSegment(spanStack[spanStackOpenIndex], -1);
            spanStackSegmentStarts[spanStackOpenIndex] = renderedOffset;
        }
    }

    function hasDifferentMarker(span: GeneratedSpan) {
        const marker = toSpanMarkerKey(span.type);
        return spanStack.some(activeSpan => toSpanMarkerKey(activeSpan.type) !== marker);
    }

    function insertActiveSpan(span: GeneratedSpan, index: number) {
        spanStack.splice(index, 0, span);
        spanStackSegmentStarts.splice(index, 0, 0);

        let endIndex = endStack.length;
        while (endIndex > 0 && endStack[endIndex - 1].end < span.end) {
            endIndex--;
        }
        endStack.splice(endIndex, 0, span);
    }

    function handlePointSpan(pointSpan: GeneratedSpan) {
        const parentCount = getInsertionIndex(spanStack, pointSpan);
        while (spanStackOpenIndex > parentCount) {
            spanStackOpenIndex--;
            closeSpanSegment(spanStack[spanStackOpenIndex], spanStackSegmentStarts[spanStackOpenIndex]);
        }
        emitPointSpan(pointSpan);

        if (currentSpanIndex === lastPointIndex) {
            closeSpanSegments(pointSpan.end);
        }
        reopenSpanSegments();
    }

    function getInsertionIndex(stack: GeneratedSpan[], span: GeneratedSpan, afterEqual: boolean = false) {
        let index = stack.length;
        while (index > 0) {
            const order = compareSpanNesting(stack[index - 1], span);
            if (order < 0 || (afterEqual && order === 0)) {
                break;
            }
            index--;
        }
        return index;
    }

    function emitPointSpan(pointSpan: GeneratedSpan) {
        openSpanSegment(pointSpan, pointSpan.end);
        closeSpanSegment(pointSpan, pointSpan.start);
    }

    function handleReplaceSpan(replaceSpan: GeneratedSpan) {
        const segmentStartOffset = renderedOffset;

        openSpanSegment(replaceSpan, replaceSpan.end);
        renderedOffset = replaceSpan.end;
        closeSpanSegment(replaceSpan, segmentStartOffset);

        // Process spans that start within the replaced span
        for (; currentSpanIndex < spans.length - 1; currentSpanIndex++) {
            const nextSpan = spans[currentSpanIndex + 1];

            // Break when the span past the replaced span
            if (nextSpan.start >= replaceSpan.end) {
                break;
            }

            // If the next span ends after the replaced span, it needs to be opened
            if (nextSpan.end > replaceSpan.end) {
                const nextSpanHooks = spanHooksMap[nextSpan.type];

                // Just skip the span and its content if it also has replace hook
                if (nextSpanHooks.replace) {
                    closeSpanSegments(nextSpan.end, true);
                    renderedOffset = nextSpan.end;
                    continue;
                }

                const insertIndex = getInsertionIndex(spanStack, nextSpan, true);
                insertActiveSpan(nextSpan, insertIndex);
            }
        }
    }
}

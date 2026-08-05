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
    // spanStack is sorted by end descending, i.e. [[2, 10], [1, 6], [3, 3]]
    const spanStack: Array<GeneratedSpan> = [];
    const spanStackSegmentStarts: number[] = []; // Parallel array to spanStack
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
                spanWeight.get(toSpanMarkerKey(b.type))! - spanWeight.get(toSpanMarkerKey(a.type))! ||
                b.end - a.end ||
                spanPriority.get(toSpanMarkerKey(a.type))! - spanPriority.get(toSpanMarkerKey(b.type))!
        );

    // Call renderer open hook
    setRootContext('open');
    appendToBuffer(renderOpenHook?.(spanHookContext));

    for (; currentSpanIndex < spans.length; currentSpanIndex++) {
        const span = spans[currentSpanIndex];
        const hook = spanHooksMap[span.type];
        const replaceMode = Boolean(hook.replace);
        const breakFlag = hook.break === true;

        // Close any spans that end before the new span starts
        closeSpanSegments(span.start);

        // Close any spans that end before the new span ends in replace mode
        if (replaceMode) {
            closeSpanSegments(span.end, true);
        }

        // Find position to insert the new span in ordered by end descending
        // so that spans with later end are opened first (higher priority)
        while (spanStackOpenIndex > 0) {
            // Stop when we find a span that ends after or at the same time as the new span;
            // However, if break flag is set, continue closing spans even if they end after
            if (!breakFlag && spanStack[spanStackOpenIndex - 1].end >= span.end) {
                break;
            }

            // Temporarily close any spans that were opened after this one
            // to maintain correct nesting order
            spanStackOpenIndex--;
            closeSpanSegment(spanStack[spanStackOpenIndex], spanStackSegmentStarts[spanStackOpenIndex]);
        }

        if (!replaceMode) {
            // Normal flow: insert new span
            spanStack.splice(spanStackOpenIndex, 0, span);
            spanStackSegmentStarts.splice(spanStackOpenIndex, 0, 0); // Set segment start to openAt
        } else {
            // Handle replace span
            handleReplaceSpan(span);
        }

        // Reopen spans that were closed to insert new span
        for (; spanStackOpenIndex < spanStack.length; spanStackOpenIndex++) {
            openSpanSegment(spanStack[spanStackOpenIndex], -1);

            // Track where this segment started (current offset) for close/wrap hooks
            spanStackSegmentStarts[spanStackOpenIndex] = renderedOffset;
        }
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

        // Find next span's start that comes after renderedOffset
        // and will cause interruption (its end > some opened span's end)
        for (let i = currentSpanIndex + 1; i < spans.length; i++) {
            const nextSpan = spans[i];

            if (nextSpan.start < segmentEnd) {
                const nextSpanHooks = spanHooksMap[nextSpan.type];
                const isBreakSpan =
                    // Break flag closes all opened spans at nextSpan.start
                    nextSpanHooks.break ||
                    // Replace flag closes spans that end at or before nextSpan.end
                    (nextSpanHooks.replace && currentSpan.end <= nextSpan.end) ||
                    // Check if this span will cause an interruption to the current span
                    // It causes interruption if its end is greater than the current span's end
                    currentSpan.end < nextSpan.end;

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

    function closeSpanSegments(offset: number, replaceMode: boolean = false) {
        while (spanStackOpenIndex > 0) {
            const topSpanEnd = spanStack[spanStackOpenIndex - 1].end;

            if (topSpanEnd > offset) {
                break;
            }

            if (!replaceMode) {
                renderText(topSpanEnd);
            }

            spanStackOpenIndex--;
            closeSpanSegment(spanStack[spanStackOpenIndex], spanStackSegmentStarts[spanStackOpenIndex]);
            spanStack.pop();
            spanStackSegmentStarts.pop();
        }

        if (!replaceMode) {
            renderText(offset);
        }
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
                const breakFlag = nextSpanHooks.break;
                let insertIndex = spanStack.length;

                // Find insert position in span stack
                for (let k = spanStack.length - 1; k >= 0; k--) {
                    if (!breakFlag && spanStack[k].end >= nextSpan.end) {
                        break;
                    }
                    insertIndex--;
                }

                // Close any spans that would be interrupted by the new span
                while (spanStackOpenIndex > insertIndex) {
                    spanStackOpenIndex--;
                    closeSpanSegment(spanStack[spanStackOpenIndex], spanStackSegmentStarts[spanStackOpenIndex]);
                }

                // Just skip the span and its content if it also has replace hook
                if (nextSpanHooks.replace) {
                    closeSpanSegments(nextSpan.end, true);
                    renderedOffset = nextSpan.end;
                    continue;
                }

                // Insert new span
                spanStack.splice(insertIndex, 0, nextSpan);
                spanStackSegmentStarts.splice(insertIndex, 0, 0);
            }
        }
    }
}

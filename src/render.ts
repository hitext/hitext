import { resolveRangeHooksMap } from './range-hooks-map.js';
import { StringBuffer } from './utils/string-buffer.js';
import type {
    GeneratedRange,
    RangeHookContext,
    RenderHooks,
    RangeMarker,
    RangeHooksDefinitionMap,
    RangeHookText,
    RenderBuffer,
    RangeCallableHook
} from './types.js';

function functionOrValue<K, T>(value: K, fallback: T): (K extends Function ? K : T) {
    return typeof value === 'function' ? value as any : fallback as any;
}

export function render<T, R = T, HC = unknown>(
    source: string,
    ranges: GeneratedRange[],
    rangeHooksDefinitionMap: RangeHooksDefinitionMap<any, T, R, HC> | null = null,
    renderHooks: Partial<RenderHooks<T, R, HC>> = {}
) {
    // Renderer output assembly methods
    const createBuffer = functionOrValue(renderHooks.createBuffer, () => new StringBuffer() as unknown as RenderBuffer<T, R>);
    const renderOpenHook = functionOrValue(renderHooks.open, null);
    const renderCloseHook = functionOrValue(renderHooks.close, null);
    const renderTextHook = functionOrValue(renderHooks.text, (sourceChunk: string) => sourceChunk);

    // Helper to append only non-empty content
    const appendToBuffer = (child: any) => {
        if ((child ?? '') !== '') { // Skip null/undefined/empty string
            currentBuffer.append(child);
        }
    };

    // Get hooks map from definitions
    const rangeHooksMap = resolveRangeHooksMap(rangeHooksDefinitionMap || {}, renderHooks);
    const rangePriority: RangeMarker[] = Reflect.ownKeys(rangeHooksMap);
    const rangeWeight = new Map<RangeMarker, number>(
        rangePriority.map((marker) => [marker,
            (rangeHooksMap[marker].break ? 2 : 0) +
            (rangeHooksMap[marker].replace ? 1 : 0)
        ])
    );

    // Create renderer context with options
    const rangeIndexMap = new Map<GeneratedRange, number>();
    const rangeHookContext: RangeHookContext<any> = Object.defineProperties(Object.create(null), {
        hook: { get: () => currentRangeHook },
        source: { value: source },
        offset: { get: () => renderedOffset },
        line: { get: () => line },
        column: { get: () => column },
        start: { get: () => segmentStart },
        end: { get: computeSegmentEnd },
        rangeIndex: { get: getRangeIndex },
        rangeText: { get: () => source.slice(currentRange.start, currentRange.end) },
        range: { get: () => currentRange },
        data: { get: () => currentRange.data },
        dump: { value: () => (Object.fromEntries(Reflect.ownKeys(rangeHookContext)
            .map((key) => [key, (rangeHookContext as any)[key]])
            .filter(key => key[0] !== 'dump')
        )) }
    });
    let renderedOffset = 0;
    let segmentStart = 0;
    let segmentEnd = -1;
    let lineColumnOffset = 0;
    let line = 1;
    let column = 1;

    // Track buffers stack for nested ranges with content hook
    const bufferStack: ReturnType<typeof createBuffer>[] = [];
    let currentBuffer = createBuffer();

    // Track opened ranges and their segment start offsets
    // rangeStack is sorted by end descending, i.e. [[2, 10], [1, 6], [3, 3]]
    const rangeStack: Array<GeneratedRange> = [];
    const rangeStackSegmentStarts: number[] = []; // Parallel array to activeRanges
    let rangeStackOpenIndex = 0;
    let currentRangeHook: RangeCallableHook = 'open';
    let currentRange: GeneratedRange = {
        type: Symbol('root'),
        start: 0,
        end: source.length,
        data: undefined
    };

    // Filter and sort ranges (avoid input mutation)
    // Remove ranges without hooks and invalid ranges upfront
    ranges = ranges
        .filter(range =>
            Object.hasOwn(rangeHooksMap, range.type) &&
            range.start <= range.end &&
            Number.isFinite(range.start) &&
            Number.isFinite(range.end)
        )
        .sort(
            (a, b) =>
                a.start - b.start ||
                rangeWeight.get(b.type)! - rangeWeight.get(a.type)! ||
                b.end - a.end ||
                rangePriority.indexOf(a.type) - rangePriority.indexOf(b.type)
        );

    // Call renderer open hook
    appendToBuffer(renderOpenHook?.(rangeHookContext));

    let currentRangeIndex = 0;
    for (; currentRangeIndex < ranges.length; currentRangeIndex++) {
        const range = ranges[currentRangeIndex];
        const hook = rangeHooksMap[range.type];
        const replaceMode = Boolean(hook.replace);
        const breakFlag = hook.break === true;

        // Close any ranges that end before the new range starts
        closeRangeSegments(range.start);

        // Close any ranges that end before the new range ends in replace mode
        if (replaceMode) {
            closeRangeSegments(range.end, true);
        }

        // Find position to insert the new range in ordered by end descending
        // so that ranges with later end are opened first (higher priority)
        while (rangeStackOpenIndex > 0) {
            // Stop when we find a range that ends after or at the same time as the new range;
            // However, if break flag is set, continue closing ranges even if they end after
            if (!breakFlag && rangeStack[rangeStackOpenIndex - 1].end >= range.end) {
                break;
            }

            // Temporarily close any ranges that were opened after this one
            // to maintain correct nesting order
            rangeStackOpenIndex--;
            closeRangeSegment(rangeStack[rangeStackOpenIndex], rangeStackSegmentStarts[rangeStackOpenIndex]);
        }

        if (!replaceMode) {
            // Normal flow: insert new range
            rangeStack.splice(rangeStackOpenIndex, 0, range);
            rangeStackSegmentStarts.splice(rangeStackOpenIndex, 0, 0); // Set segment start to openAt
        } else {
            // Handle replace range
            handleReplaceRange(range);
        }

        // Reopen ranges that were closed to insert new range
        for (; rangeStackOpenIndex < rangeStack.length; rangeStackOpenIndex++) {
            openRangeSegment(rangeStack[rangeStackOpenIndex], -1);

            // Track where this segment started (current offset) for close/content hooks
            rangeStackSegmentStarts[rangeStackOpenIndex] = renderedOffset;
        }
    }

    closeRangeSegments(source.length);

    // Close ranges that end out of source boundaries
    while (rangeStackOpenIndex > 0) {
        rangeStackOpenIndex--;
        closeRangeSegment(rangeStack[rangeStackOpenIndex], source.length);
    }

    // Finish rendering - call renderer close hook
    appendToBuffer(renderCloseHook?.(rangeHookContext));

    // Final output
    return currentBuffer.emit();

    //
    // Handlers
    //

    function updateLineAndColumn(upToOffset: number) {
        for (; lineColumnOffset < upToOffset; lineColumnOffset++) {
            const ch = source.charCodeAt(lineColumnOffset);

            if (ch === 0x0a /* \n */ || (ch === 0x0d /* \r */ && (
                lineColumnOffset >= source.length || source.charCodeAt(lineColumnOffset + 1) !== 0x0a
            ))) {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
    }

    function getRangeIndex(): number {
        let rangeIndex = rangeIndexMap.get(currentRange);

        if (rangeIndex === undefined) {
            rangeIndexMap.set(currentRange, rangeIndex = rangeIndexMap.size);
        }

        return rangeIndex;
    }

    function computeSegmentEnd() {
        // Lazy computation: if segmentEnd is -1, compute it
        if (segmentEnd !== -1) {
            return segmentEnd;
        }

        // The segment end is determined by the next event:
        // - The current range's natural end
        // - Or a new range starts that will cause interruption (has greater end than current range)
        // - Or a replace/break range that will close the current range early
        segmentEnd = currentRange.end;

        // Find next range's start that comes after renderedOffset
        // and will cause interruption (its end > some opened range's end)
        for (let i = currentRangeIndex + 1; i < ranges.length; i++) {
            const nextRange = ranges[i];

            if (nextRange.start < segmentEnd) {
                const nextRangeHooks = rangeHooksMap[nextRange.type];
                const isBreakRange =
                    // Break flag closes all opened ranges at nextRange.start
                    nextRangeHooks.break ||
                    // Replace flag closes ranges that end at or before nextRange.end
                    (nextRangeHooks.replace && currentRange.end <= nextRange.end) ||
                    // Check if this range will cause an interruption to the current range
                    // It causes interruption if its end is greater than the current range's end
                    currentRange.end < nextRange.end;

                if (isBreakRange) {
                    segmentEnd = nextRange.start;
                    break;
                }
            }
        }

        return segmentEnd;
    }

    function openRangeSegment(range: GeneratedRange, rangeSegmentEnd: number) {
        const rangeHooks = rangeHooksMap[range.type];

        // Set current range for context
        currentRange = range;

        // For open hook: start is the current offset, end is computed lazily
        segmentStart = renderedOffset;
        segmentEnd = rangeSegmentEnd;

        // Call open hook (goes to current buffer)
        if (rangeHooks.open) {
            currentRangeHook = 'open';
            appendToBuffer(rangeHooks.open(rangeHookContext));
        }

        // Create new buffer for accumulating content
        if (rangeHooks.wrap) {
            bufferStack.push(currentBuffer);
            currentBuffer = createBuffer();
        }

        // Inject replace content if applicable
        if (rangeHooks.replace) {
            currentRangeHook = 'replace';
            appendToBuffer(rangeHooks.replace(rangeHookContext));
        }
    }

    function closeRangeSegment(range: GeneratedRange, rangeSegmentStart: number) {
        const rangeHooks = rangeHooksMap[range.type];

        // Set current range for context
        currentRange = range;

        // Set segment boundaries
        segmentStart = rangeSegmentStart;
        segmentEnd = renderedOffset;

        if (rangeHooks.wrap) {
            // Get accumulated content and restore parent buffer
            const content = currentBuffer.emit();
            currentBuffer = bufferStack.pop()!;

            // Emit wrapped accumulated content
            currentRangeHook = 'wrap';
            appendToBuffer(rangeHooks.wrap(content, rangeHookContext));
        }

        // Call close hook (goes to current buffer)
        if (rangeHooks.close) {
            currentRangeHook = 'close';
            appendToBuffer(rangeHooks.close(rangeHookContext));
        }
    };

    function renderText(offset: number) {
        if (renderedOffset === offset) {
            return;
        }

        // Update line and column tracking
        updateLineAndColumn(offset);

        // Find the text hook by walking up the stack of opened ranges
        // to inherit text transformation from parent ranges
        let textHook: RangeHookText<any, T> = renderTextHook;
        for (let i = rangeStack.length - 1; i >= 0; i--) {
            const rangeTextHook = rangeHooksMap[rangeStack[i].type].text;
            if (rangeTextHook !== null) {
                textHook = rangeTextHook;
                break;
            }
        }

        // Append to current buffer
        const substring = source.slice(renderedOffset, offset);
        currentRangeHook = 'text';
        appendToBuffer(textHook(substring, rangeHookContext));

        renderedOffset = offset;
    }

    function closeRangeSegments(offset: number, replaceMode: boolean = false) {
        while (rangeStackOpenIndex > 0) {
            const topRangeEnd = rangeStack[rangeStackOpenIndex - 1].end;

            if (topRangeEnd > offset) {
                break;
            }

            if (!replaceMode) {
                renderText(topRangeEnd);
            }

            rangeStackOpenIndex--;
            closeRangeSegment(rangeStack[rangeStackOpenIndex], rangeStackSegmentStarts[rangeStackOpenIndex]);
            rangeStack.pop();
            rangeStackSegmentStarts.pop();
        }

        if (!replaceMode) {
            renderText(offset);
        }
    }

    function handleReplaceRange(replaceRange: GeneratedRange) {
        const segmentStartOffset = renderedOffset;

        openRangeSegment(replaceRange, replaceRange.end);
        updateLineAndColumn(renderedOffset = replaceRange.end);
        closeRangeSegment(replaceRange, segmentStartOffset);

        // Process ranges that start within the replaced range
        for (; currentRangeIndex < ranges.length - 1; currentRangeIndex++) {
            const nextRange = ranges[currentRangeIndex + 1];

            // Break when the range past the replaced range
            if (nextRange.start >= replaceRange.end) {
                break;
            }

            // If the next range ends after the replaced range, it needs to be opened
            if (nextRange.end > replaceRange.end) {
                const nextRangeHooks = rangeHooksMap[nextRange.type];
                const breakFlag = nextRangeHooks.break;
                let insertIndex = rangeStack.length;

                // Find insert position in range stack
                for (let k = rangeStack.length - 1; k >= 0; k--) {
                    if (!breakFlag && rangeStack[k].end >= nextRange.end) {
                        break;
                    }
                    insertIndex--;
                }

                // Close any ranges that would be interrupted by the new range
                while (rangeStackOpenIndex > insertIndex) {
                    rangeStackOpenIndex--;
                    closeRangeSegment(rangeStack[rangeStackOpenIndex], rangeStackSegmentStarts[rangeStackOpenIndex]);
                }

                // Just skip the range and its content if it also has replace hook
                if (nextRangeHooks.replace) {
                    closeRangeSegments(nextRange.end, true);
                    renderedOffset = nextRange.end;
                    continue;
                }

                // Insert new range
                rangeStack.splice(insertIndex, 0, nextRange);
                rangeStackSegmentStarts.splice(insertIndex, 0, 0);
            }
        }
    }
}

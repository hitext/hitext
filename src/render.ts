import { resolveRangeHooksMap } from './range-hooks-map.js';
import { StringBuffer } from './string-buffer.js';
import type {
    GeneratedRange,
    RangeHookContext,
    RenderHooks,
    RangeMarker,
    RangeHooksDefinitionMap,
    RangeHookText,
    RenderBuffer
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
    const renderTextHook = functionOrValue(renderHooks.escape, (sourceChunk: string) => sourceChunk);

    // Helper to append only non-empty content
    const appendToBuffer = (child: any) => {
        if ((child ?? '') !== '') { // Skip null/undefined/empty string
            currentBuffer.append(child);
        }
    };

    // Get hooks map from definitions
    const rangeHooksMap = resolveRangeHooksMap(rangeHooksDefinitionMap || {}, renderHooks);
    const rangePriority: RangeMarker[] = Reflect.ownKeys(rangeHooksMap);

    // Create renderer context with options
    const renderContext: RangeHookContext<any> = Object.defineProperties(Object.create(null), {
        source: { value: source },
        offset: { get: () => renderedOffset },
        line: { get: () => line },
        column: { get: () => column },
        start: { get: () => segmentStart },
        end: { get: () => computeSegmentEnd() },
        rangeText: { get: () => source.slice(currentRange.start, currentRange.end) },
        range: { get: () => currentRange },
        data: { get: () => currentRange.data },
        dump: { value: () => (Object.fromEntries(Reflect.ownKeys(renderContext)
            .map((key) => [key, (renderContext as any)[key]])
            .filter(key => key[0] !== 'dump')
        )) }
    });
    let renderedOffset = 0;
    let closingOffset = Infinity;
    let segmentStart = 0;
    let segmentEnd = -1;
    let line = 1;
    let column = 1;

    // Track buffers stack for nested ranges with content hook
    const bufferStack: ReturnType<typeof createBuffer>[] = [];
    let currentBuffer = createBuffer();

    // Track opened ranges and their segment start offsets
    const openedRanges: Array<GeneratedRange> = [];
    const rangeSegmentStarts: number[] = []; // Parallel array to openedRanges
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
                b.end - a.end ||
                rangePriority.indexOf(a.type) - rangePriority.indexOf(b.type)
        );

    // Call renderer open hook
    appendToBuffer(renderOpenHook?.(renderContext));

    let currentRangeIndex = 0;
    for (; currentRangeIndex < ranges.length; currentRangeIndex++) {
        const range = ranges[currentRangeIndex];
        let j = 0;

        closeRangeSegments(range.start);
        renderChunk(range.start);

        for (j = 0; j < openedRanges.length; j++) {
            if (openedRanges[j].end < range.end) {
                for (let k = openedRanges.length - 1; k >= j; k--) {
                    closeRangeSegment(k);
                }
                break;
            }
        }

        openedRanges.splice(j, 0, range);
        rangeSegmentStarts.splice(j, 0, 0); // Placeholder, will be set in openRangeSegment

        for (; j < openedRanges.length; j++) {
            openRangeSegment(j);
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRangeSegments(source.length);
    renderChunk(source.length);

    // Render ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        closeRangeSegment(i);
    }

    // Finish rendering - call renderer close hook
    appendToBuffer(renderCloseHook?.(renderContext));

    // Final output
    return currentBuffer.emit();

    //
    // Handlers
    //

    function computeSegmentEnd() {
        // Lazy computation: if segmentEnd is -1, compute it
        if (segmentEnd !== -1) {
            return segmentEnd;
        }

        // The segment end is determined by the next event:
        // - The current range's natural end
        // - Or a new range starts that will cause interruption (has greater end than current range)
        segmentEnd = currentRange.end;

        // Find next range's start that comes after renderedOffset
        // and will cause interruption (its end > some opened range's end)
        for (let i = currentRangeIndex + 1; i < ranges.length; i++) {
            const nextRange = ranges[i];

            if (nextRange.start > renderedOffset) {
                // Check if this range will cause an interruption
                // It causes interruption if its end is greater than any opened range's end
                for (let j = 0; j < openedRanges.length; j++) {
                    if (openedRanges[j].end < nextRange.end) {
                        // This range causes interruption
                        if (nextRange.start < segmentEnd) {
                            segmentEnd = nextRange.start;
                        }
                        // Found interruption, can stop searching
                        return segmentEnd;
                    }
                }
            }
        }

        return segmentEnd;
    }

    function openRangeSegment(index: number) {
        currentRange = openedRanges[index];
        const hook = rangeHooksMap[currentRange.type];

        // For open hook: start is the current offset, end is computed lazily
        segmentStart = renderedOffset;
        segmentEnd = -1;

        // Track where this segment started (current offset) for close/content hooks
        rangeSegmentStarts[index] = renderedOffset;

        // Call open hook (goes to current buffer, or parent if range hook exists)
        appendToBuffer(hook.open?.(renderContext));

        // Check if this range uses range hook
        if (hook.wrap) {
            // Start accumulating content for this range
            bufferStack.push(currentBuffer);
            currentBuffer = createBuffer();
        }
    }

    function closeRangeSegment(index: number) {
        currentRange = openedRanges[index];
        const hook = rangeHooksMap[currentRange.type];

        // Set segment boundaries for this closing segment
        segmentStart = rangeSegmentStarts[index];
        segmentEnd = renderedOffset;

        if (hook.wrap) {
            const contentBuffer = currentBuffer;
            currentBuffer = bufferStack.pop()!;

            // Emit the buffer content
            appendToBuffer(hook.wrap(contentBuffer.emit(), renderContext));
        }

        // Call close hook (goes to current buffer, which is parent after range processing)
        appendToBuffer(hook.close?.(renderContext));
    };

    function renderChunk(offset: number) {
        if (renderedOffset === offset) {
            return;
        }

        const substring = source.slice(renderedOffset, offset);

        // Find the text hook by walking up the stack of opened ranges
        // to inherit text transformation from parent ranges
        let textHook: RangeHookText<any, T> = renderTextHook;
        for (let i = openedRanges.length - 1; i >= 0; i--) {
            const rangeTextHook = rangeHooksMap[openedRanges[i].type].escape;
            if (rangeTextHook !== null) {
                textHook = rangeTextHook;
                break;
            }
        }

        // Update line and column tracking
        for (let i = renderedOffset; i < offset; i++) {
            const ch = source.charCodeAt(i);

            if (ch === 0x0a /* \n */ || (ch === 0x0d /* \r */ && (i >= source.length || source.charCodeAt(i + 1) !== 0x0a))) {
                line++;
                column = 1;
            } else {
                column++;
            }
        }

        // Always append to current buffer
        appendToBuffer(textHook(substring, renderContext));

        renderedOffset = offset;
    }

    function closeRangeSegments(offset: number) {
        while (closingOffset <= offset) {
            renderChunk(closingOffset);

            for (let j = openedRanges.length - 1; j >= 0; j--) {
                if (openedRanges[j].end !== closingOffset) {
                    break;
                }
                closeRangeSegment(j);
                openedRanges.pop();
                rangeSegmentStarts.pop();
            }

            // Find next closing offset
            closingOffset = Infinity;

            for (let j = 0; j < openedRanges.length; j++) {
                if (openedRanges[j].end < closingOffset) {
                    closingOffset = openedRanges[j].end;
                }
            }
        }
    }
}

import { resolveRangeHooksMap } from './range-hooks-map.js';
import { StringBuffer } from './string-buffer.js';
import type {
    GeneratedRange,
    RangeHookContext,
    RenderHooks,
    RangeMarker,
    RangeHooksDefinitionMap,
    RangeHooksNormalizedMap
} from './types.js';

const noOutput = () => null;

function ensureFunction<T extends Function>(value: T | undefined, alt: T) {
    return typeof value === 'function' ? value : alt;
}

export function render<T, R = T, HC = unknown>(
    source: string,
    ranges: GeneratedRange[],
    rangeHooksDefinitionMap: RangeHooksDefinitionMap<any, T, R, HC> | null = null,
    renderHooks: Partial<RenderHooks<T, R, HC>> = {}
) {
    // Renderer output assembly methods
    const createBuffer = ensureFunction(renderHooks.createBuffer, () => new StringBuffer() as any);
    const renderOpenHook = ensureFunction(renderHooks.open, noOutput);
    const renderCloseHook = ensureFunction(renderHooks.close, noOutput);
    const renderTextHook = ensureFunction(renderHooks.text, (sourceChunk: string) => sourceChunk);

    // Helper to append only non-empty content
    const appendToBuffer = (child: any) => {
        if ((child ?? '') !== '') { // Skip null/undefined/empty string
            currentBuffer.append(child);
        }
    };

    // Get hooks from renderer
    const rangeHooksMap = resolveRangeHooksMap(rangeHooksDefinitionMap || {}, renderHooks);
    const rangeHooksNormMap: RangeHooksNormalizedMap<T, R> = Object.create(null);
    const rangePriority: RangeMarker[] = [];

    // Normalize hooks to have all methods
    for (const type of Reflect.ownKeys(rangeHooksMap)) {
        const rangeHook = rangeHooksMap[type];

        rangePriority.push(type);
        rangeHooksNormMap[type] = {
            open: ensureFunction(rangeHook.open, noOutput),
            close: ensureFunction(rangeHook.close, noOutput),
            content: rangeHook.content,
            text: ensureFunction(rangeHook.text, renderTextHook)
        };
    }

    // Create renderer context with options
    const renderContext: RangeHookContext<any> = Object.defineProperties(Object.create(null), {
        offset: { get: () => renderedOffset },
        line: { get: () => line },
        column: { get: () => column },
        start: { get: () => currentRange.start },
        end: { get: () => currentRange.end },
        data: { get: () => currentRange.data }
    });
    let renderedOffset = 0;
    let closingOffset = Infinity;
    let line = 1;
    let column = 1;

    // Track buffers stack for nested ranges with content hook
    const bufferStack: ReturnType<typeof createBuffer>[] = [];
    let currentBuffer = createBuffer();

    // Track opened ranges
    const openedRanges: Array<GeneratedRange> = [];
    let currentRange: GeneratedRange = {
        type: Symbol('root'),
        start: 0,
        end: source.length,
        data: undefined
    };

    // sort ranges (avoid input mutation)
    ranges = ranges.slice().sort(
        (a, b) =>
            a.start - b.start ||
            b.end - a.end ||
            rangePriority.indexOf(a.type) - rangePriority.indexOf(b.type)
    );

    // Call renderer open hook
    appendToBuffer(renderOpenHook(renderContext));

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        let j = 0;

        // Ignore ranges without a type hook
        if (!Object.hasOwn(rangeHooksNormMap, range.type)) {
            continue;
        }

        // Ignore ranges with wrong start/end values
        if (range.start > range.end || !Number.isFinite(range.start) || !Number.isFinite(range.end)) {
            continue;
        }

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
    appendToBuffer(renderCloseHook(renderContext));

    // Final output
    return currentBuffer.emit();

    //
    // Handlers
    //

    function openRangeSegment(index: number) {
        currentRange = openedRanges[index];
        const hook = rangeHooksNormMap[currentRange.type];

        // Call open hook (goes to current buffer, or parent if range hook exists)
        appendToBuffer(hook.open(renderContext));

        // Check if this range uses range hook
        if (hook.content) {
            // Start accumulating content for this range
            bufferStack.push(currentBuffer);
            currentBuffer = createBuffer();
        }
    }

    function closeRangeSegment(index: number) {
        currentRange = openedRanges[index];
        const hook = rangeHooksNormMap[currentRange.type];

        if (hook.content) {
            const contentBuffer = currentBuffer;
            currentBuffer = bufferStack.pop()!;

            // Emit the buffer content
            const content = contentBuffer.emit();
            appendToBuffer(hook.content(content, renderContext));
        }

        // Call close hook (goes to current buffer, which is parent after range processing)
        appendToBuffer(hook.close(renderContext));
    };

    function renderChunk(offset: number) {
        if (renderedOffset === offset) {
            return;
        }

        const substring = source.slice(renderedOffset, offset);
        const renderSubstr = openedRanges.length > 0
            ? rangeHooksNormMap[openedRanges[openedRanges.length - 1].type].text
            : renderTextHook;

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
        appendToBuffer(renderSubstr(substring, renderContext));

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

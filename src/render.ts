import { StringBuffer } from './string-buffer.js';
import type { GeneratedRange, RangeHookContext, RangeHooks, RenderHooks, RangeMarker } from './types.d.js';

const hasOwn = Object.hasOwn || ((o, k) => Object.prototype.hasOwnProperty.call(o, k));
const noOutput = () => null;

function ensureFunction<T extends Function>(value: T | undefined, alt: T) {
    return typeof value === 'function' ? value : alt;
}

export function render<T, R = T>(
    source: string,
    ranges: GeneratedRange[],
    rangeHooksMap: Record<string | symbol, Partial<RangeHooks<any, any>>>,
    renderHooks: Partial<RenderHooks<T, R>> = {}
) {
    // Renderer output assembly methods
    const createBuffer = ensureFunction(renderHooks.createBuffer, () => new StringBuffer() as any);
    const renderOpen = ensureFunction(renderHooks.open, noOutput as any);
    const renderClose = ensureFunction(renderHooks.close, noOutput as any);
    const renderText = ensureFunction(renderHooks.text, (sourceChunk: string) => sourceChunk);

    // Helper to append only non-empty content
    const append = (child: any) => {
        if ((child ?? '') !== '') { // Skip null/undefined/empty string
            buffer.append(child);
        }
    };

    // Get hooks from renderer
    const rangeHooksSource = rangeHooksMap || {};
    const rangePriority: Array<symbol | string | number> = [];
    let closingOffset = Infinity;

    // Normalize hooks to have all methods
    const normRangeHooksMap: Record<RangeMarker, RangeHooks<any, any>> = [
        ...Object.getOwnPropertyNames(rangeHooksSource),
        ...Object.getOwnPropertySymbols(rangeHooksSource)
    ].reduce((result, type) => {
        const rangeHook = rangeHooksSource[type];

        if (rangeHook) {
            rangePriority.push(type);
            result[type] = {
                open: ensureFunction(rangeHook.open, noOutput),
                close: ensureFunction(rangeHook.close, noOutput),
                node: rangeHook.node,
                text: ensureFunction(rangeHook.text, renderText)
            };
        }

        return result;
    }, Object.create(null));

    // sort ranges
    ranges = ranges.slice().sort(
        (a, b) =>
            a.start - b.start ||
            b.end - a.end ||
            rangePriority.indexOf(a.type) - rangePriority.indexOf(b.type)
    );

    // Create renderer context with options
    const renderContext: RangeHookContext<any> =
        Object.defineProperties(Object.create(null), {
            offset: { get: () => renderedOffset },
            line: { get: () => line },
            column: { get: () => column },
            start: { get: () => currentRange.start },
            end: { get: () => currentRange.end },
            data: { get: () => currentRange.data }
        });
    let renderedOffset = 0;
    let line = 1;
    let column = 1;

    // Track content accumulation - buffer stack with current buffer pointer
    const rangeContentStack: ReturnType<typeof createBuffer>[] = [];
    let buffer = createBuffer();

    // Track opened ranges
    const openedRanges: Array<GeneratedRange> = [];
    const nullType = Symbol('root');
    let currentRange: GeneratedRange = { type: nullType, start: 0, end: source.length, data: undefined };

    // Call renderer open hook
    append(renderOpen(renderContext));

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        let j = 0;

        // Ignore ranges without a type hook
        if (!hasOwn(normRangeHooksMap, range.type)) {
            continue;
        }

        // Ignore ranges with wrong start/end values
        if (range.start > range.end || !Number.isFinite(range.start) || !Number.isFinite(range.end)) {
            continue;
        }

        closeRanges(range.start);
        renderChunk(range.start);

        for (j = 0; j < openedRanges.length; j++) {
            if (openedRanges[j].end < range.end) {
                for (let k = openedRanges.length - 1; k >= j; k--) {
                    closeRange(k);
                }
                break;
            }
        }

        openedRanges.splice(j, 0, range);

        for (; j < openedRanges.length; j++) {
            openRange(j);
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRanges(source.length);
    renderChunk(source.length);

    // Render ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        closeRange(i);
    }

    // Finish rendering - call renderer close hook
    append(renderClose(renderContext));

    // Final output
    return buffer.emit();

    //
    // Handlers
    //

    function openRange(index: number) {
        currentRange = openedRanges[index];
        const hook = normRangeHooksMap[currentRange.type];

        // Call open hook (goes to current buffer, or parent if node hook exists)
        append(hook.open(renderContext));

        // Check if this range uses node hook
        if (hook.node) {
            // Start accumulating content for this range
            rangeContentStack.push(buffer);
            buffer = createBuffer();
        }
    }

    function closeRange(index: number) {
        currentRange = openedRanges[index];
        const hook = normRangeHooksMap[currentRange.type];

        if (hook.node) {
            const contentBuffer = buffer;
            buffer = rangeContentStack.pop()!;

            // Emit the buffer content - check if buffer has emit method for backward compatibility
            const content = contentBuffer.emit();
            append(hook.node(content, renderContext));
        }

        // Call close hook (goes to current buffer, which is parent after node processing)
        append(hook.close(renderContext));
    };

    function renderChunk(offset: number) {
        if (renderedOffset === offset) {
            return;
        }

        const substring = source.slice(renderedOffset, offset);
        const renderSubstr = openedRanges.length
            ? normRangeHooksMap[openedRanges[openedRanges.length - 1].type].text
            : renderText;

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
        append(renderSubstr(substring, renderContext));

        renderedOffset = offset;
    }

    function closeRanges(offset: number) {
        while (closingOffset <= offset) {
            renderChunk(closingOffset);

            for (let j = openedRanges.length - 1; j >= 0; j--) {
                if (openedRanges[j].end !== closingOffset) {
                    break;
                }
                closeRange(j);
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

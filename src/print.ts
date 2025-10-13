import { StringBuffer } from './string-buffer.js';
import type { GeneratedRange, PrinterHookContext, RangeHooks, PrintHooks, RangeMarker } from './types.d.js';

const hasOwn = Object.hasOwn || ((o, k) => Object.prototype.hasOwnProperty.call(o, k));
const emptyString = () => '';

function ensureFunction<T extends Function>(value: T | undefined, alt: T) {
    return typeof value === 'function' ? value : alt;
}

export default function print<T, R = T>(
    source: string,
    ranges: GeneratedRange[],
    rangeHooksMap: Record<string | symbol, Partial<RangeHooks<any, any>>>,
    printHooks: Partial<PrintHooks<T, R>> = {}
) {
    // Printer output assembly methods
    const createBuffer = ensureFunction(printHooks.createBuffer, () => new StringBuffer() as any);
    const printOpen = ensureFunction(printHooks.open, emptyString as any);
    const printClose = ensureFunction(printHooks.close, emptyString as any);
    const printText = ensureFunction(printHooks.text, (sourceChunk: string) => sourceChunk);

    // Helper to append only non-empty content
    const append = (child: any) => {
        if ((child ?? '') !== '') { // Skip null/undefined/empty string
            buffer.append(child);
        }
    };

    // Create printer context with options
    const printContext: PrinterHookContext<any> =
        Object.defineProperties(Object.create(null), {
            offset: { get: () => printedOffset },
            line: { get: () => line },
            column: { get: () => column },
            start: { get: () => currentRange.start },
            end: { get: () => currentRange.end },
            data: { get: () => currentRange.data }
        });
    let printedOffset = 0;
    let line = 1;
    let column = 1;

    const openedRanges: Array<GeneratedRange> = [];
    const nullType = Symbol('root');
    let currentRange: GeneratedRange = { type: nullType, start: 0, end: source.length, data: undefined };

    // Get hooks from printer
    const rangeHooksSource = rangeHooksMap || {};
    const rangePriority: Array<symbol | string | number> = [];
    let closingOffset = Infinity;

    // Track content accumulation - buffer stack with current buffer pointer
    const rangeContentStack: ReturnType<typeof createBuffer>[] = [];
    let buffer = createBuffer();

    // Call printer open hook
    append(printOpen(printContext));

    // Normalize hooks to have all methods
    const normRangeHooksMap: Record<RangeMarker, RangeHooks<any, any>> = [
        ...Object.getOwnPropertyNames(rangeHooksSource),
        ...Object.getOwnPropertySymbols(rangeHooksSource)
    ].reduce((result, type) => {
        const rangeHook = rangeHooksSource[type];

        if (rangeHook && typeof rangeHook === 'object') {
            rangePriority.push(type);
            result[type] = {
                // Support both before/open and after/close for compatibility
                open: rangeHook.open || emptyString,
                close: rangeHook.close || emptyString,
                node: rangeHook.node,
                text: rangeHook.text || printText
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

    const openRange = (index: number) => {
        currentRange = openedRanges[index];
        const hook = normRangeHooksMap[currentRange.type];

        // Call open hook (goes to current buffer, or parent if node hook exists)
        append(hook.open(printContext));

        // Check if this range uses node hook
        if (hook.node) {
            // Start accumulating content for this range
            rangeContentStack.push(buffer);
            buffer = createBuffer();
        }
    };

    const closeRange = (index: number) => {
        currentRange = openedRanges[index];
        const hook = normRangeHooksMap[currentRange.type];

        if (hook.node) {
            const contentBuffer = buffer;
            buffer = rangeContentStack.pop()!;

            // Emit the buffer content - check if buffer has emit method for backward compatibility
            const content = contentBuffer.emit();
            append(hook.node(content, printContext));
        }

        // Call close hook (goes to current buffer, which is parent after node processing)
        append(hook.close(printContext));
    };

    const printChunk = (offset: number) => {
        if (printedOffset === offset) {
            return;
        }

        const substring = source.slice(printedOffset, offset);
        const printSubstr = openedRanges.length
            ? normRangeHooksMap[openedRanges[openedRanges.length - 1].type].text
            : printText;

        // Update line and column tracking
        for (let i = printedOffset; i < offset; i++) {
            const ch = source.charCodeAt(i);

            if (ch === 0x0a /* \n */ || (ch === 0x0d /* \r */ && (i >= source.length || source.charCodeAt(i + 1) !== 0x0a))) {
                line++;
                column = 1;
            } else {
                column++;
            }
        }

        // Always append to current buffer
        append(printSubstr(substring, printContext));

        printedOffset = offset;
    };

    const closeRanges = (offset: number) => {
        while (closingOffset <= offset) {
            printChunk(closingOffset);

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
    };

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
        printChunk(range.start);

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
    printChunk(source.length);

    // Print ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        closeRange(i);
    }

    // Finish printing - call printer close hook
    append(printClose(printContext));

    return buffer.emit();
}

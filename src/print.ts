import type { Printer, Range, PrinterRangeHooksMap, PrinterHookContext } from './types.d.js';

const hasOwn = Object.hasOwn || ((o, k) => Object.prototype.hasOwnProperty.call(o, k));
const emptyString = () => '';

// Hook name constants
const HOOK_NODE = 'node';
const HOOK_BEFORE = 'before';
const HOOK_AFTER = 'after';
const HOOK_TEXT = 'text';
const HOOK_OPEN = 'open';
const HOOK_CLOSE = 'close';
const HOOK_PRINT = 'print';

function ensureFunction<T extends Function>(value: T | undefined, alt: T) {
    return typeof value === 'function' ? value : alt;
}

class StringBuffer {
    buffer = '';
    append(child: string) {
        this.buffer += child;
    }
    toString() {
        return this.buffer;
    }
}

export default function print(source: string, ranges: Range[], printer: Printer, options?: any) {
    // Support both old (print) and new (text) API
    const print = ensureFunction(printer[HOOK_TEXT] || printer[HOOK_PRINT], (chunk: string) => chunk);

    // Printer output assembly methods
    const createRoot = ensureFunction(printer.createRoot, () => new StringBuffer());
    const appendFn = ensureFunction(printer.append, (buffer: any, child: any) => buffer.append(child));
    const finalize = ensureFunction(printer.finalize, (buffer: any) => String(buffer));

    // Helper to append only non-empty content
    const append = (child: any) => {
        if ((child ?? '') !== '') {
            appendFn(buffer, child);
        }
    };

    // Create printer context with options
    const printerContext = ensureFunction(printer.createContext, () => ({}))(options);

    const printContext: PrinterHookContext = Object.assign(
        Object.defineProperties(Object.create(null), {
            offset: { get: () => printedOffset },
            line: { get: () => line },
            column: { get: () => column },
            start: { get: () => currentRange.start },
            end: { get: () => currentRange.end },
            data: { get: () => currentRange.data }
        }),
        printerContext
    );

    const openedRanges: Array<Range> = [];
    const nullType = Symbol('root');
    let currentRange: Range = { type: nullType, start: 0, end: source.length, data: undefined };
    const rangeHooksSource = printer.ranges || {};
    const rangePriority: Array<symbol | string | number> = [];
    let closingOffset = Infinity;
    let printedOffset = 0;
    let line = 1;
    let column = 1;

    // Track content accumulation - buffer stack with current buffer pointer
    const rangeContentStack: any[] = [];
    let buffer = createRoot(options);

    // Support both old (open/close) and new (before/after) API at printer level
    const beforeResult = ensureFunction(printer[HOOK_BEFORE] || printer[HOOK_OPEN], emptyString)(printContext);
    append(beforeResult);

    // preprocess range hooks - normalize API (support both old and new names)
    const rangeHooks: PrinterRangeHooksMap = [
        ...Object.getOwnPropertyNames(rangeHooksSource),
        ...Object.getOwnPropertySymbols(rangeHooksSource)
    ].reduce((result, type) => {
        let rangeHook = rangeHooksSource[type];

        if (typeof rangeHook === 'function') {
            rangeHook = printer.createHook(rangeHook);
        }

        if (rangeHook) {
            rangePriority.push(type);
            result[type] = {
                before: ensureFunction(rangeHook[HOOK_BEFORE] || rangeHook[HOOK_OPEN], emptyString),
                after: ensureFunction(rangeHook[HOOK_AFTER] || rangeHook[HOOK_CLOSE], emptyString),
                node: rangeHook[HOOK_NODE],
                text: ensureFunction(rangeHook[HOOK_TEXT] || rangeHook[HOOK_PRINT], print)
            };
        }

        return result;
    }, Object.create(null) as PrinterRangeHooksMap);

    // sort ranges
    ranges = ranges.slice().sort(
        (a, b) =>
            a.start - b.start ||
            b.end - a.end ||
            rangePriority.indexOf(a.type) - rangePriority.indexOf(b.type)
    );

    const open = (index: number) => {
        currentRange = openedRanges[index];
        const hook = rangeHooks[currentRange.type];

        // Call before/open hook (goes to current buffer, or parent if node hook exists)
        append(hook.before?.(printContext));

        // Check if this range uses node hook
        if (hook.node) {
            // Start accumulating content for this range
            rangeContentStack.push(buffer);
            buffer = createRoot(options);
        }
    };

    const close = (index: number) => {
        currentRange = openedRanges[index];
        const hook = rangeHooks[currentRange.type];

        if (hook.node) {
            const contentBuffer = buffer;
            buffer = rangeContentStack.pop();

            // Append node result
            append(hook.node(contentBuffer, printContext));
        }

        // Call after/close hook (goes to current buffer, which is parent after node processing)
        append(hook.after?.(printContext));
    };

    const printChunk = (offset: number) => {
        if (printedOffset === offset) {
            return;
        }

        const substring = source.slice(printedOffset, offset);
        const printSubstr = openedRanges.length
            ? rangeHooks[openedRanges[openedRanges.length - 1].type].text
            : print;

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
        append(printSubstr?.(substring, printContext));

        printedOffset = offset;
    };
    const closeRanges = (offset: number) => {
        while (closingOffset <= offset) {
            printChunk(closingOffset);

            for (let j = openedRanges.length - 1; j >= 0; j--) {
                if (openedRanges[j].end !== closingOffset) {
                    break;
                }
                close(j);
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
        if (!hasOwn(rangeHooks, range.type)) {
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
                    close(k);
                }
                break;
            }
        }

        openedRanges.splice(j, 0, range);

        for (; j < openedRanges.length; j++) {
            open(j);
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRanges(source.length);
    printChunk(source.length);

    // Print ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        close(i);
    }

    // Finish printing
    const afterResult = ensureFunction(printer[HOOK_AFTER] || printer[HOOK_CLOSE], emptyString)(printContext);
    append(afterResult);

    return finalize(buffer);
};

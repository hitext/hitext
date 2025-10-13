import type { Printer, Range, PrinterRangeHooksMap, PrinterHookContext } from './types.d.js';

const hasOwn = Object.hasOwn || ((o, k) => Object.prototype.hasOwnProperty.call(o, k));
const emptyString = () => '';
const noop = function() {};

// Hook name constants
const HOOK_NODE = 'node';
const HOOK_BEFORE = 'before';
const HOOK_AFTER = 'after';
const HOOK_TEXT = 'text';
const HOOK_OPEN = 'open';
const HOOK_CLOSE = 'close';
const HOOK_PRINT = 'print';

// Constant for throwing callback (when content() is called outside of node hook context)
const contentNotAvailable = function() {
    throw new Error('content() is only available in node hook context');
};

function ensureFunction<T extends Function>(value: T | undefined, alt: T) {
    return typeof value === 'function' ? value : alt;
}

// Helper to append only non-empty content
function appendIfNotEmpty(parent: any, child: any, appendFn: (parent: any, child: any) => void): void {
    if (child !== '' && child != null) {
        appendFn(parent, child);
    }
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

export default function print(source: string, ranges: Range[], printer: Printer) {
    // Support both old (print) and new (text) API
    const print = ensureFunction(printer[HOOK_TEXT] || printer[HOOK_PRINT], (chunk: string) => chunk);

    // Printer output assembly methods
    const createRoot = ensureFunction(printer.createRoot, () => new StringBuffer());
    const append = ensureFunction(printer.append, (buffer: any, child: any) => buffer.append(child));
    const finalize = ensureFunction(printer.finalize, (buffer: any) => String(buffer));

    // Create a mutable content callback holder
    let contentCallback: () => any = contentNotAvailable;

    const printContext: PrinterHookContext = Object.assign(
        Object.defineProperties(Object.create(null), {
            offset: { get: () => printedOffset },
            line: { get: () => line },
            column: { get: () => column },
            start: { get: () => currentRange.start },
            end: { get: () => currentRange.end },
            data: { get: () => currentRange.data },
            content: {
                get: () => contentCallback,
                enumerable: true
            }
        }),
        ensureFunction(printer.createContext, noop)()
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
    const buffer = createRoot();

    // Support both old (open/close) and new (before/after) API at printer level
    const beforeResult = ensureFunction(printer[HOOK_BEFORE] || printer[HOOK_OPEN], emptyString)(printContext);
    appendIfNotEmpty(buffer, beforeResult, append);

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
                open: ensureFunction(rangeHook[HOOK_BEFORE] || rangeHook[HOOK_OPEN], emptyString),
                close: ensureFunction(rangeHook[HOOK_AFTER] || rangeHook[HOOK_CLOSE], emptyString),
                text: ensureFunction(rangeHook[HOOK_TEXT] || rangeHook[HOOK_PRINT], print),
                node: rangeHook[HOOK_NODE]
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

    // Track content accumulation for ranges with node hooks
    const rangeContentStack: any[] = [];
    const rangeHasNode: boolean[] = [];
    let insideNodeHookRange = false;

    const open = (index: number) => {
        currentRange = openedRanges[index];
        const hook = rangeHooks[currentRange.type];

        if (!hook) {
            console.error('NO HOOK FOR TYPE:', currentRange.type);
            return '';
        }

        // Check if this range uses node hook
        if (hook.node) {
            // Start accumulating content for this range
            rangeHasNode.push(true);
            rangeContentStack.push(createRoot());
            insideNodeHookRange = true;
            return ''; // Don't output open tag yet
        } else {
            // Normal open/before behavior
            rangeHasNode.push(false);
            const openTag = hook.open?.(printContext) || '';

            // If we're inside a node hook range, add to content stack
            if (insideNodeHookRange) {
                const lastIndex = rangeContentStack.length - 1;
                appendIfNotEmpty(rangeContentStack[lastIndex], openTag, append);
                return '';
            }
            return openTag;
        }
    };

    const close = (index: number) => {
        currentRange = openedRanges[index];
        const hook = rangeHooks[currentRange.type];
        const hasNode = rangeHasNode.pop();

        if (hasNode && hook.node) {
            const accumulatedContent = rangeContentStack.pop() || createRoot();

            // Check if we're still inside another node hook range
            insideNodeHookRange = rangeContentStack.length > 0;

            // Use node hook with content callback
            contentCallback = () => accumulatedContent;
            const result = hook.node(printContext) || '';
            contentCallback = contentNotAvailable;

            // Add result to parent's content or buffer
            if (insideNodeHookRange) {
                const lastIndex = rangeContentStack.length - 1;
                appendIfNotEmpty(rangeContentStack[lastIndex], result, append);
                return '';
            }
            return result;
        }

        // Normal close/after behavior
        const closeTag = hook.close?.(printContext) || '';

        // If we're inside a node hook range, add to content stack
        if (insideNodeHookRange) {
            const lastIndex = rangeContentStack.length - 1;
            appendIfNotEmpty(rangeContentStack[lastIndex], closeTag, append);
            return '';
        }
        return closeTag;
    };

    const printChunk = (offset: number) => {
        if (printedOffset === offset) {
            return;
        }

        const substring = source.substring(printedOffset, offset);
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

        const transformed = printSubstr?.(substring, printContext) || '';

        // Add to appropriate buffer
        const targetBuffer = insideNodeHookRange
            ? rangeContentStack[rangeContentStack.length - 1]
            : buffer;
        appendIfNotEmpty(targetBuffer, transformed, append);

        printedOffset = offset;
    };
    const closeRanges = (offset: number) => {
        while (closingOffset <= offset) {
            printChunk(closingOffset);

            for (let j = openedRanges.length - 1; j >= 0; j--) {
                if (openedRanges[j].end !== closingOffset) {
                    break;
                }
                appendIfNotEmpty(buffer, close(j), append);
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
                    appendIfNotEmpty(buffer, close(k), append);
                }
                break;
            }
        }

        openedRanges.splice(j, 0, range);

        for (; j < openedRanges.length; j++) {
            appendIfNotEmpty(buffer, open(j), append);
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRanges(source.length);
    printChunk(source.length);

    // Print ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        appendIfNotEmpty(buffer, close(i), append);
    }

    // Finish printing
    const afterResult = ensureFunction(printer[HOOK_AFTER] || printer[HOOK_CLOSE], emptyString)(printContext);
    appendIfNotEmpty(buffer, afterResult, append);

    return finalize(buffer);
};

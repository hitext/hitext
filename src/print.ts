import type { Printer, Range, PrinterRangeHooksMap, PrinterHookContext } from './types.d.js';

const emptyString = () => '';
const noop = function() {};

function ensureFunction<T extends Function>(value: T | undefined, alt: T) {
    return typeof value === 'function' ? value : alt;
}

export default function print(source: string, ranges: Range[], printer: Printer) {
    const print = ensureFunction(printer.print, (chunk: string) => chunk);
    const printContext: PrinterHookContext = Object.assign(
        Object.defineProperties(Object.create(null), {
            offset: { get: () => printedOffset },
            line:   { get: () => line },
            column: { get: () => column },
            start:  { get: () => currentRange.start },
            end:    { get: () => currentRange.end },
            data:   { get: () => currentRange.data }
        }),
        ensureFunction(printer.createContext, noop)()
    );
    const openedRanges: Array<Range> = [];
    const nullType = Symbol('root');
    let currentRange: Range = { type: nullType, start: 0, end: source.length, data: undefined };
    let rangeHooks2 = printer.ranges || {};
    let rangePriority: Array<symbol | string> = [];
    let closingOffset = Infinity;
    let printedOffset = 0;
    let line = 1;
    let column = 1;
    let buffer = '';

    buffer += ensureFunction(printer.open, emptyString)(printContext);

    // preprocess range hooks
    const rangeHooks: PrinterRangeHooksMap = [
        ...Object.getOwnPropertyNames(rangeHooks2),
        ...Object.getOwnPropertySymbols(rangeHooks2)
    ].reduce((result, type) => {
        let rangeHook = rangeHooks2[type];

        if (typeof rangeHook === 'function') {
            console.log('???', rangeHook);
            rangeHook = printer.createHook(rangeHook);
        }

        if (rangeHook) {
            rangePriority.push(type);
            result[type] = {
                open: ensureFunction(rangeHook.open, emptyString),
                close: ensureFunction(rangeHook.close, emptyString),
                print: ensureFunction(rangeHook.print, print)
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

    // main part
    const open = (index: number) => rangeHooks[(currentRange = openedRanges[index]).type].open?.(printContext) || '';
    const close = (index: number) => rangeHooks[(currentRange = openedRanges[index]).type].close?.(printContext) || '';
    const printChunk = (offset) => {
        if (printedOffset !== offset) {
            const substring = source.substring(printedOffset, offset);
            const printSubstr = openedRanges.length
                ? rangeHooks[openedRanges[openedRanges.length - 1].type].print
                : print;

            for (let i = printedOffset; i < offset; i++) {
                const ch = source.charCodeAt(i);

                if (ch === 0x0a /* \n */ || (ch === 0x0d /* \r */ && (i >= source.length || source.charCodeAt(i + 1) !== 0x0a))) {
                    line++;
                    column = 1;
                } else {
                    column++;
                }
            }

            buffer += printSubstr(substring, printContext);
            printedOffset = offset;
        }
    };
    const closeRanges = (offset) => {
        while (closingOffset <= offset) {
            printChunk(closingOffset);

            for (let j = openedRanges.length - 1; j >= 0; j--) {
                if (openedRanges[j].end !== closingOffset) {
                    break;
                }
                buffer += close(j);
                openedRanges.pop();
            }

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

        // ignore ranges without a type hook
        if (hasOwnProperty.call(rangeHooks, range.type) === false) {
            continue;
        }

        // ignore ranges with wrong start/end values
        if (range.start > range.end || !Number.isFinite(range.start) || !Number.isFinite(range.end)) {
            continue;
        }

        closeRanges(range.start);
        printChunk(range.start);

        for (j = 0; j < openedRanges.length; j++) {
            if (openedRanges[j].end < range.end) {
                for (let k = openedRanges.length - 1; k >= j; k--) {
                    buffer += close(k);
                }
                break;
            }
        }

        openedRanges.splice(j, 0, range);

        for (; j < openedRanges.length; j++) {
            buffer += open(j);
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRanges(source.length);
    printChunk(source.length);

    // print ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        buffer += close(i);
    }

    // finish printing
    buffer += ensureFunction(printer.close, emptyString)(printContext) || '';

    return buffer;
};

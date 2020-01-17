const emptyString = () => '';
const noop = function() {};

function ensureFunction(value, alt) {
    return typeof value === 'function' ? value : alt || noop;
}

// NOTE: ranges must be sorted
module.exports = function print(source, ranges, printer) {
    const print = ensureFunction(printer.print, chunk => chunk);
    const printContext = Object.assign(
        Object.defineProperties(Object.create(null), {
            offset: { get: () => printedOffset },
            line: {   get: () => line },
            column: { get: () => column },
            start: {  get: () => currentRange.start },
            end: {    get: () => currentRange.end },
            data: {   get: () => currentRange.data }
        }),
        ensureFunction(printer.createContext)()
    );
    const openedRanges = [];
    let currentRange = { start: 0, end: source.length };
    let closingOffset = Infinity;
    let printedOffset = 0;
    let line = 1;
    let column = 1;
    let buffer = '';

    // start printing
    buffer += ensureFunction(printer.open, emptyString)(printContext);

    // main part
    const open = index => (currentRange = openedRanges[index]).printer.open(printContext) || '';
    const close = index => (currentRange = openedRanges[index]).printer.close(printContext) || '';
    const printChunk = (offset) => {
        if (printedOffset !== offset) {
            const substring = source.substring(printedOffset, offset);
            const printSubstr = openedRanges.length ? openedRanges[openedRanges.length - 1].printer.print : print;

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

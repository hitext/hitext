const emptyString = () => '';
const noop = function() {};

function ensureFunction(value, alt) {
    return typeof value === 'function' ? value : alt || noop;
}

module.exports = function print(source, ranges, printer) {
    const print = ensureFunction(printer.print, chunk => chunk);
    const context = ensureFunction(printer.createContext)();
    const openedRanges = [];
    let rangeHooks = printer.ranges || {};
    let hookPriority = [];
    let buffer = ensureFunction(printer.open, emptyString)(context);
    let closingOffset = Infinity;
    let printedOffset = 0;

    // preprocess range hooks
    rangeHooks = [].concat(
        Object.getOwnPropertyNames(rangeHooks),
        Object.getOwnPropertySymbols(rangeHooks)
    ).reduce((result, type) => {
        let rangeHook = rangeHooks[type];

        if (typeof rangeHook === 'function') {
            rangeHooks[type] = rangeHook = printer.createHook(rangeHook);
        }

        if (rangeHook) {
            hookPriority.push(type);
            result[type] = {
                open: ensureFunction(rangeHook.open, emptyString),
                close: ensureFunction(rangeHook.close, emptyString),
                print: ensureFunction(rangeHook.print, print)
            };
        }

        return result;
    }, {});

    // sort ranges
    ranges = ranges.slice().sort(
        (a, b) =>
            a.start - b.start ||
            b.end - a.end ||
            hookPriority.indexOf(a.type) - hookPriority.indexOf(b.type)
    );

    // main part
    const open = index => rangeHooks[openedRanges[index].type].open(openedRanges[index].data, context) || '';
    const close = index => rangeHooks[openedRanges[index].type].close(openedRanges[index].data, context) || '';
    const printSource = (offset) => {
        if (printedOffset !== offset) {
            const printSubstr = openedRanges.length ? rangeHooks[openedRanges[openedRanges.length - 1].type].print : print;
            buffer += printSubstr(source.substring(printedOffset, offset), context);
            printedOffset = offset;
        }
    };
    const closeRanges = (offset) => {
        while (closingOffset <= offset) {
            printSource(closingOffset);

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
        if (rangeHooks.hasOwnProperty(range.type) === false) {
            continue;
        }

        // ignore ranges with wrong start/end values
        if (range.start > range.end || !Number.isFinite(range.start) || !Number.isFinite(range.end)) {
            continue;
        }

        closeRanges(range.start);
        printSource(range.start);

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
    printSource(source.length);

    // print ranges out of source boundaries
    for (let i = openedRanges.length - 1; i >= 0; i--) {
        buffer += close(i);
    }

    // finish printing
    buffer += ensureFunction(printer.close, emptyString)(context) || '';

    return buffer;
};

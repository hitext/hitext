const utils = require('./utils');
const { ensureArray, ensureFunction } = utils;
const generators = require('./generator');
const printers = require('./printer');
const emptyString = () => '';

function resolvePrinter(printer) {
    return printers[printer] || (printer && typeof printer === 'object' ? printer : printers.noop);
}

function generateRanges(source, generators) {
    const ranges = [];

    ensureArray(generators)
        .forEach(generate => {
            ensureFunction(generate)(source, (type, start, end, data) =>
                ranges.push({ type, start, end, data })
            );
        });

    return ranges;
}

function print(source, ranges, printer) {
    printer = resolvePrinter(printer);

    const print = ensureFunction(printer.print, chunk => chunk);
    const context = ensureFunction(printer.createContext, () => {})();
    const openedRanges = [];
    let hooks = printer.hooks || {};
    let hookPriority = [];
    let buffer = ensureFunction(printer.open, emptyString)(context);
    let closingOffset = Infinity;
    let printedOffset = 0;

    // preprocess hooks
    hooks = Object.keys(hooks).reduce((result, type) => {
        hookPriority.push(type);
        result[type] = {
            open: ensureFunction(hooks[type].open, emptyString),
            close: ensureFunction(hooks[type].close, emptyString)
        };

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
    const printSource = (offset) => {
        if (printedOffset !== offset) {
            buffer += print(source.substring(printedOffset, offset), context);
            printedOffset = offset;
        }
    };
    const open = index => hooks[openedRanges[index].type].open(openedRanges[index].data, context) || '';
    const close = index => hooks[openedRanges[index].type].close(openedRanges[index].data, context) || '';
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
        if (hooks.hasOwnProperty(range.type) === false) {
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
}

function finalize(source, printer) {
    printer = resolvePrinter(printer);

    return ensureFunction(printer.finalize, String).call(printer, source);
}

function decorate(source, generators, printer) {
    const ranges = generateRanges(source, generators);
    let result = print(source, ranges, printer);

    result = finalize(result, printer);

    return result;
}

function hitext(generators, printer) {
    generators = ensureArray(generators);

    return {
        use(generator) {
            return hitext(generators.concat(generator), printer);
        },
        printer(printer) {
            return hitext(generators, printer);
        },
        decorate(source) {
            return decorate(source, generators, printer);
        }
    };
}

module.exports = Object.assign(hitext, {
    printer: printers,
    generator: generators,
    generateRanges,
    print,
    finalize,
    decorate,
    utils
});

const utils = require('./utils');
const { ensureArray, ensureFunction } = utils;
const generators = require('./generator');
const printers = require('./printer');
const emptyString = () => '';

function resolvePrinter(printer, printerSet) {
    if (printer in printerSet) {
        printer = printerSet[printer];
    }

    return printer && typeof printer === 'object' ? printer : printers.noop;
}

function generateRanges(source, generators) {
    const ranges = [];
    const addRange = (type, start, end, data) => ranges.push({ type, start, end, data });

    ensureArray(generators).forEach(generate =>
        ensureFunction(generate)(source, addRange)
    );

    return ranges;
}

function print(source, ranges, printer) {
    printer = resolvePrinter(printer, printers);

    const print = ensureFunction(printer.print, chunk => chunk);
    const context = ensureFunction(printer.createContext, () => {})();
    const openedRanges = [];
    let rangeHooks = printer.ranges || {};
    let hookPriority = [];
    let buffer = ensureFunction(printer.open, emptyString)(context);
    let closingOffset = Infinity;
    let printedOffset = 0;

    // preprocess range hooks
    rangeHooks = Object.keys(rangeHooks).reduce((result, type) => {
        const rangeHook = rangeHooks[type];
        hookPriority.push(type);
        result[type] = {
            open: ensureFunction(rangeHook.open, emptyString),
            close: ensureFunction(rangeHook.close, emptyString),
            print: ensureFunction(rangeHook.print, print)
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
}

function finalize(source, printer) {
    printer = resolvePrinter(printer, printers);

    return ensureFunction(printer.finalize, String).call(printer, source);
}

function decorate(source, generators, printer) {
    const ranges = generateRanges(source, generators);
    const printResult = print(source, ranges, printer);
    const result = finalize(printResult, printer);

    return result;
}

function pipelineChain(generators, printerSet, selectedPrinter) {
    const decorateMethod = (source, printer) =>
        decorate(source, generators, resolvePrinter(printer || selectedPrinter, printerSet));

    return Object.assign(decorateMethod, {
        decorate: decorateMethod,
        use(plugin, printer) {
            const generator = plugin.generator || plugin;
            const newPrinter = printer || plugin.printer;
            const newPrinterSet = newPrinter
                ? printerSet.fork(newPrinter)
                : printerSet;

            if (typeof generator === 'function') {
                generators = generators.concat(generator);
            }

            return pipelineChain(generators, newPrinterSet, selectedPrinter);
        },
        printer(selectedPrinter) {
            return pipelineChain(generators, printerSet, selectedPrinter);
        }
    });
}

function hitext(generators, selectedPrinter) {
    return pipelineChain(ensureArray(generators), printers, selectedPrinter);
}

module.exports = Object.assign(hitext, {
    printer: printers,
    generator: generators,
    generateRanges,
    resolvePrinter,
    print,
    finalize,
    decorate,
    utils
});

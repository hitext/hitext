const utils = require('./utils');
const generators = require('./temp-generators');
const printers = require('./printer');

function resolvePrinter(printer) {
    return printers[printer] || (printer && typeof printer === 'object' ? printer : printers.noop);
}

function generateRanges(source, generators) {
    const ranges = [];

    utils.ensureArray(generators)
        .forEach(generate => {
            utils.ensureFunction(generate)(source, (type, start, end, data) =>
                ranges.push({ type, start, end, data })
            );
        });

    return ranges;
}

function print(source, ranges, printer) {
    printer = resolvePrinter(printer);

    const print = utils.ensureFunction(printer.print, chunk => chunk);
    const context = utils.ensureFunction(printer.createContext, () => {})();
    const openedRanges = [];
    let hooks = printer.hooks || {};
    let hookPriority = [];
    let buffer = utils.ensureFunction(printer.start, () => '')(context);
    let closingOffset = Infinity;
    let printedOffset = 0;

    // preprocess hooks
    hooks = Object.keys(hooks).reduce((result, type) => {
        hookPriority.push(type);
        result[type] = {
            open: utils.ensureFunction(hooks[type].open, () => ''),
            close: utils.ensureFunction(hooks[type].close, () => '')
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

    buffer += utils.ensureFunction(printer.finish, () => {})(context) || '';

    return buffer;
}

function finalize(source, printer) {
    printer = resolvePrinter(printer);

    return utils.ensureFunction(printer.finalize, String).call(printer, source);
}

function decorate(source, generators, printer) {
    const ranges = generateRanges(source, generators);
    // console.log(ranges);

    let result = print(source, ranges, printer);
    // console.log(result);

    result = finalize(result, printer);
    // console.log(result);

    return result;
}

module.exports = {
    printer: printers,
    generator: generators,
    generateRanges,
    print,
    finalize,
    decorate,
    utils
};

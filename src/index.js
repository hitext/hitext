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

    const escape = utils.ensureFunction(printer.escape, chunk => chunk);
    const context = [];
    const printSource = (offset) => {
        if (printedSource !== offset) {
            buffer += escape(source.substring(printedSource, offset));
            printedSource = offset;
        }
    };
    const closeRanges = (offset) => {
        while (closingOffset <= offset) {
            printSource(closingOffset);

            for (let j = context.length - 1; j >= 0; j--) {
                if (context[j].end !== closingOffset) {
                    break;
                }
                buffer += hooks[context[j].type].close(context[j].data);
                context.pop();
            }

            closingOffset = Infinity;

            for (let j = 0; j < context.length; j++) {
                if (context[j] !== null && context[j].end < closingOffset) {
                    closingOffset = context[j].end;
                }
            }
        }
    };

    let hooks = printer.hooks || {};
    let buffer = '';
    let closingOffset = Infinity;
    let printedSource = 0;

    // sort ranges
    ranges = ranges.slice().sort(
        (a, b) => a.start - b.start || b.end - a.end
    );

    // preprocess hooks
    hooks = Object.keys(hooks).reduce((result, type) => {
        result[type] = {
            open: utils.ensureFunction(hooks[type].open, () => ''),
            close: utils.ensureFunction(hooks[type].close, () => '')
        };

        return result;
    }, {});

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        let j = 0;

        // ignore ranges without a type hook
        if (hooks.hasOwnProperty(range.type) === false) {
            continue;
        }

        closeRanges(range.start);
        printSource(range.start);

        for (j = 0; j < context.length; j++) {
            if (context[j].end < range.end) {
                for (let k = j; k < context.length; k++) {
                    buffer += hooks[context[k].type].close(context[k].data);
                }
                break;
            }
        }

        context.splice(j, 0, range);

        for (; j < context.length; j++) {
            buffer += hooks[context[j].type].open(context[j].data);
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRanges(source.length);
    printSource(source.length);

    for (let j = 0; j < context.length; j++) {
        if (context[j] !== null) {
            buffer += hooks[context[j].type].close(context[j].data);
        }
    }

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
    decorate
};

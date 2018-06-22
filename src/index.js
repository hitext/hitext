const utils = require('./utils');
const decorators = require('./temp-decorators');
const printers = require('./printer');

function resolvePrinter(printer) {
    return printers[printer] || (printer && typeof printer === 'object' ? printer : printers.noop);
}

function resolveDecoratorTarget(decorator, printer) {
    return decorator.print && decorator.print[printer.target] || {};
}

function generateRanges(source, decorators) {
    const ranges = [];

    utils.ensureArray(decorators)
        .map(({ genRanges }) =>
            utils.ensureFunction(genRanges, () => {})
        )
        .forEach((genRanges, index) => {
            genRanges(source, (start, end, data) =>
                ranges.push({ type: index, start, end, data })
            );
        });

    return ranges;
}

function print(source, ranges, decorators, printer) {
    printer = resolvePrinter(printer);
    decorators = utils.ensureArray(decorators);

    const escape = utils.ensureFunction(printer.escape, chunk => chunk);
    const context = decorators.map(() => null);
    const printSource = (offset) => {
        if (printedSource !== offset) {
            buffer += escape(source.substring(printedSource, offset));
            printedSource = offset;
        }
    };
    const closeRanges = (offset) => {
        while (closingOffset <= offset) {
            printSource(closingOffset);

            for (let j = 0; j < context.length; j++) {
                if (context[j] !== null && context[j].end === closingOffset) {
                    buffer += decorators[j].close(context[j].data);
                    context[j] = null;
                }
            }

            closingOffset = Infinity;

            for (let j = 0; j < context.length; j++) {
                if (context[j] !== null && context[j].end < closingOffset) {
                    closingOffset = context[j].end;
                }
            }
        }
    };

    let buffer = '';
    let closingOffset = Infinity;
    let printedSource = 0;

    // sort ranges
    ranges = ranges.slice().sort(
        (a, b) => a.start - b.start || b.type - a.type
    );

    // preprocess decorators
    decorators = utils.ensureArray(decorators).map(decorator => {
        const decoratorPrinter = resolveDecoratorTarget(decorator, printer);

        return {
            open: utils.ensureFunction(decoratorPrinter.open, () => ''),
            close: utils.ensureFunction(decoratorPrinter.close, () => '')
        };
    });

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];

        closeRanges(range.start);
        printSource(range.start);

        for (let j = 0; j <= range.type; j++) {
            if (context[j] !== null) {
                buffer += decorators[j].close(context[j].data);
            }
        }

        context[range.type] = range;

        for (let j = range.type; j >= 0; j--) {
            if (context[j] !== null) {
                buffer += decorators[j].open(context[j].data);
            }
        }

        if (range.end < closingOffset) {
            closingOffset = range.end;
        }
    }

    closeRanges(source.length);
    printSource(source.length);

    for (let j = 0; j < context.length; j++) {
        if (context[j] !== null) {
            buffer += decorators[j].close(context[j].data);
        }
    }

    return buffer;
}

function finalize(source, decorators, printer) {
    printer = resolvePrinter(printer);

    return utils.ensureFunction(printer.finalize, String)(
        source,
        utils.ensureArray(decorators).map(decorator => resolveDecoratorTarget(decorator, printer))
    );
}

function decorate(source, decorators, printer) {
    const ranges = generateRanges(source, decorators);
    // console.log(ranges);

    let result = print(source, ranges, decorators, printer);
    // console.log(result);

    result = finalize(result, decorators, printer);
    // console.log(result);

    return result;
}

module.exports = {
    printer: printers,
    decorator: decorators,
    generateRanges,
    print,
    finalize,
    decorate
};

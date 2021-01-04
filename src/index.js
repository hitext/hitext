const generators = require('./generator');
const printers = require('./printer');
const generateRanges = require('./generateRanges');
const print = require('./print');

function preprocessGenerator(marker, generate) {
    return {
        marker,
        generate
    };
}

function preprocessPrinter(marker, printer) {
    const newPrinter = {};

    for (let key in printer) {
        newPrinter[key] = {
            ranges: {
                [marker]: printer[key]
            }
        };
    }

    return newPrinter;
}

function pipelineChain(generators, printerSet, defaultPrinterType) {
    const pipeline = (source, printerType) => {
        const printer = printerSet[printerType || defaultPrinterType] || printers.noop;
        const ranges = generateRanges(source, generators);
        const result = print(source, ranges, printer);

        return result;
    };

    return Object.assign(pipeline, {
        print: pipeline,
        generateRanges(source) {
            return generateRanges(source, generators);
        },
        use(plugin, printer) {
            const marker = Symbol(plugin.name);
            const ranges = plugin.ranges || plugin;
            const generate = Array.isArray(ranges)
                ? (source, createRange) => ranges.forEach(range => createRange(...range))
                : ranges;

            if (typeof generate !== 'function') {
                return pipeline; // exception?
            }

            if (!printer) {
                printer = plugin.printer;
            }

            if (!printer) {
                return pipeline; // exception?
            }

            return pipelineChain(
                generators.concat(preprocessGenerator(marker, generate)),
                printerSet.fork(preprocessPrinter(marker, printer)),
                defaultPrinterType
            );
        },
        printer(selectedPrinter) {
            return pipelineChain(generators, printerSet, selectedPrinter);
        }
    });
}

function hitext(plugins, printerType, printerSet) {
    let pipeline = pipelineChain([], printerSet || printers, printerType);

    if (Array.isArray(plugins)) {
        pipeline = plugins.reduce(
            (pipeline, plugin) => Array.isArray(plugin) ? pipeline.use(...plugin) : pipeline.use(plugin),
            pipeline
        );
    }

    return pipeline;
}

module.exports = Object.assign(hitext, {
    gen: generators,
    printer: Object.assign((...args) => hitext().printer(...args), printers),
    use: (...args) => hitext().use(...args)
});

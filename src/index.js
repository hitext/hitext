const generators = require('./generator');
const printers = require('./printer');
const generateRanges = require('./generateRanges');
const print = require('./print');
const emptyString = () => '';
const defaultPipeline = hitext();

function ensureFunction(value, alt) {
    return typeof value === 'function' ? value : alt || (() => {});
}

function printerFromPipeline(pipeline, printer, printerType) {
    if (!pipeline.printer) {
        pipeline.forEach(item => {
            let rangeHook = item.printers[printerType];

            if (rangeHook && !rangeHook.norm) {
                if (typeof rangeHook === 'function') {
                    rangeHook = printer.createHook(rangeHook);
                }

                if (rangeHook) {
                    rangeHook = {
                        norm: true,
                        open: ensureFunction(rangeHook.open, emptyString),
                        close: ensureFunction(rangeHook.close, emptyString),
                        print: ensureFunction(rangeHook.print, printer.print || (x => x))
                    };
                }

                item.printers[printerType] = rangeHook;
            }
        });
    }

    return pipeline.printer;
}

function pipelineChain(pipeline, printerSet, defaultPrinterType) {
    const performAction = (source, printerType) => {
        const printer = printerSet[printerType || defaultPrinterType] || printers.noop;
        const ranges = generateRanges(source, pipeline, printerType || defaultPrinterType);
        const result = print(source, ranges, {
            ...printer,
            ranges: printerFromPipeline(pipeline, printer, printerType || defaultPrinterType)
        });

        return result;
    };

    return Object.assign(performAction, {
        print: performAction,
        generateRanges(source, printerType) {
            return generateRanges(source, pipeline, printerType || defaultPrinterType);
        },
        use(plugin, printer) {
            const marker = Symbol(plugin.name);
            const ranges = plugin.ranges || plugin;
            const generate = Array.isArray(ranges)
                ? (source, createRange) => ranges.forEach(range => createRange(...range))
                : ranges;

            if (typeof generate !== 'function') {
                return performAction; // exception?
            }

            if (!printer) {
                printer = plugin.printer;
            }

            if (!printer) {
                return performAction; // exception?
            }

            return pipelineChain(
                pipeline.concat({
                    marker,
                    generate,
                    printers: Object.assign({}, printer)
                }),
                printerSet,
                defaultPrinterType
            );
        },
        printer(selectedPrinter) {
            return pipelineChain(pipeline, printerSet, selectedPrinter);
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

module.exports = Object.assign(hitext, defaultPipeline, {
    gen: generators,
    printer: Object.assign(defaultPipeline.printer, printers)
});

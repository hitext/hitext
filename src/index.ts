import * as generators from './generator/index';
import printers from './printer/index';
import type { createRange, Plugin, PluginRef, Marker, Generator, Range, PrinterSet, generateRanges as GenerateRanges } from './types.d.js';
import noop from './printer/noop';
import generateRanges from './generateRanges';
import print from './print';

function preprocessGenerator(marker: Marker, generate: GenerateRanges): Generator {
    return {
        marker,
        generate
    };
}

function preprocessPrinter(marker: Marker, printer) {
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

interface Pipeline {
    (source: string, printerType?: string): string;
    print(source: string, printerType?: string): string;
    generateRanges(source: string): Range[];
    use(plugin: Plugin | GenerateRanges, printer?: string): Pipeline;
    printer(selectedPrinter: string): Pipeline;
};

function pipelineChain(
    generators: Generator[],
    printerSet: PrinterSet,
    defaultPrinterType: keyof typeof printerSet
): Pipeline {
    const pipeline = (source: string, printerType?: string) => {
        const printer = printerSet[printerType || defaultPrinterType] || noop;
        const ranges = generateRanges(source, generators);
        const result = print(source, ranges, printer);

        return result;
    };
    const use = (plugin: Plugin | GenerateRanges, printer?: string) => {
        if (typeof plugin === 'function') {
            plugin = { name: undefined, ranges: plugin };
        }

        const marker = Symbol(plugin.name);
        const ranges = plugin.ranges || plugin;
        const generate = Array.isArray(ranges)
            ? (source: string, createRange: createRange) => ranges.forEach(range => createRange(...range))
            : ranges;

        if (typeof generate !== 'function') {
            return pipeline as Pipeline; // exception?
        }

        if (!printer) {
            printer = plugin.printer;
        }

        if (!printer) {
            return pipeline as Pipeline; // exception?
        }

        return pipelineChain(
            generators.concat(preprocessGenerator(marker, generate)),
            printerSet.fork(preprocessPrinter(marker, printer)),
            defaultPrinterType
        );
    }

    return Object.assign(pipeline, {
        print: pipeline,
        generateRanges(source: string) {
            return generateRanges(source, generators);
        },
        use,
        printer(selectedPrinter: string) {
            return pipelineChain(generators, printerSet, selectedPrinter);
        }
    });
}

function hitext(plugins?: PluginRef[], printerType?: string, printerSet?: PrinterSet) {
    let pipeline = pipelineChain([], printerSet || printers, printerType);

    if (Array.isArray(plugins)) {
        pipeline = plugins.reduce(
            (pipeline, plugin) => Array.isArray(plugin) ? pipeline.use(...plugin) : pipeline.use(plugin),
            pipeline
        );
    }

    return pipeline;
}

export default Object.assign(hitext, {
    gen: generators,
    printer: Object.assign(printerType => hitext().printer(printerType), printers),
    use: (plugin, printer) => hitext().use(plugin, printer)
});

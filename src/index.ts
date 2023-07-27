import * as generators from './generator/index.js';
import printers from './printer/index.js';
import noop from './printer/noop.js';
import generateRanges from './generateRanges.js';
import print from './print.js';
import type {
    createRange,
    Plugin,
    PluginRef,
    Marker,
    Generator,
    Range,
    PrinterSet,
    GenerateRanges,
    PrinterSetExtension
} from './types.d.js';

function preprocessGenerator(marker: Marker, generate: GenerateRanges): Generator {
    return {
        marker,
        generate
    };
}

function preprocessPrinter(marker: Marker, printer: PrinterSetExtension) {
    const newPrinter: PrinterSetExtension = {};

    for (const key in printer) {
        newPrinter[key] = {
            ranges: {
                [marker]: printer[key]
            }
        };
    }

    return newPrinter;
}

interface Pipeline<T, K> {
    (source: string, printerType?: K): string;
    use(plugin: Plugin | GenerateRanges, printer?: PrinterSetExtension): Pipeline<T, K>;
    printer(printerType: K): Pipeline<T, K>;
    print(source: string, printerType?: K): string;
    generateRanges(source: string): Range[];
};

function pipelineChain<T extends PrinterSet, K extends Extract<keyof T, string>>(
    generators: Generator[],
    printerSet: T,
    defaultPrinterType: K
): Pipeline<T, K> {
    const printSource = (source: string, printerType = defaultPrinterType) => {
        const printer = printerSet[printerType] || noop;
        const ranges = generateRanges(source, generators);
        const result = print(source, ranges, printer);

        return result;
    };
    const use = (plugin: Plugin | GenerateRanges, printer?: PrinterSetExtension) => {
        if (typeof plugin === 'function') {
            plugin = { name: undefined, ranges: plugin };
        }

        const marker = Symbol(plugin.name);
        const ranges = plugin.ranges || plugin;
        const generate = Array.isArray(ranges)
            ? (source: string, createRange: createRange) => ranges.forEach(range => createRange(...range))
            : ranges;

        if (typeof generate !== 'function') {
            return printSource as Pipeline; // exception?
        }

        if (!printer) {
            printer = plugin.printer;
        }

        if (!printer) {
            return printSource as Pipeline; // exception?
        }

        return pipelineChain(
            generators.concat(preprocessGenerator(marker, generate)),
            printerSet.fork(preprocessPrinter(marker, printer)),
            defaultPrinterType
        );
    }

    return Object.assign(printSource, {
        use,
        printer(printerType: K) {
            return pipelineChain(generators, printerSet, printerType);
        },
        print: printSource,
        generateRanges(source: string) {
            return generateRanges(source, generators);
        }
    });
}

function hitext(plugins?: PluginRef[], printerType?: string, printerSet?: PrinterSet) {
    let pipeline = pipelineChain([], printerSet || printers, printerType);

    if (Array.isArray(plugins)) {
        pipeline = plugins.reduce(
            (pipeline, plugin) => Array.isArray(plugin)
                ? pipeline.use(...plugin as [Plugin, PrinterSetExtension])
                : pipeline.use(plugin),
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

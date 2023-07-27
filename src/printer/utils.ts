import type { Printer, PrinterExtension, PrinterHookContext, PrinterSet } from '../types.d.js';

const hasOwnProperty = Object.hasOwnProperty;
const printers: WeakSet<Printer> = new WeakSet();

export function createPrinter<Context>(base: PrinterExtension | null = null): Printer {
    return forkPrinter<Context>(null, base);
}

export function forkPrinter<Context>(from: Printer | null, extension: PrinterExtension | null = null): Printer {
    const base = from && printers.has(from) ? from : null;
    const adoptedExtension = {
        ...base,
        ...extension
    };
    const newPrinter: Printer<PrinterHookContext & Context> = {
        ...adoptedExtension,
        createHook: typeof adoptedExtension.createHook === 'function'
            ? adoptedExtension.createHook
            : fn => fn(),
        fork: (extension?: PrinterExtension) => forkPrinter(newPrinter, extension),
        ranges: {
            ...base && base.ranges,
            ...extension && extension.ranges
        }
    };

    printers.add(newPrinter);

    return newPrinter;
}

export function forkPrinterSet(this: PrinterSet | void, extension: { [key: string]: Printer | PrinterExtension; }) {
    const newPrinterSet: PrinterSet = Object.assign(Object.create(null), this, {
        fork: (extension) => forkPrinterSet.call(newPrinterSet, extension)
    });

    for (let key in extension) {
        const typePrinter = extension[key];

        if (!typePrinter || typeof typePrinter !== 'object') {
            continue;
        }

        if (hasOwnProperty.call(newPrinterSet, key)) {
            const existing = newPrinterSet[key];
            newPrinterSet[key] = existing && typeof existing.fork === 'function'
                ? existing.fork(typePrinter)
                : existing;
        } else {
            newPrinterSet[key] = createPrinter(typePrinter);
        }
    }

    return newPrinterSet;
}

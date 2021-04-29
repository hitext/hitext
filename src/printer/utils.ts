import type { Printer, PrinterExtension, PrinterSet } from '../types.d.js';

const hasOwnProperty = Object.hasOwnProperty;
const printers: WeakSet<Printer> = new WeakSet();

export function createPrinter(base: PrinterExtension = null): Printer {
    return forkPrinter.call(null, base);
}

export function forkPrinter(this: Printer | null, extension: PrinterExtension): Printer {
    const base = printers.has(this) ? this : {} as PrinterExtension;
    const newPrinter: PrinterExtension = {};

    Object.assign(newPrinter, base, extension, {
        fork: forkPrinter.bind(newPrinter),
        ranges: Object.assign({}, base.ranges, extension && extension.ranges)
    });

    if (typeof newPrinter.createHook !== 'function') {
        newPrinter.createHook = fn => fn();
    }

    printers.add(newPrinter as Printer);
    return newPrinter as Printer;
}

export function forkPrinterSet(extension: { [key: string]: Printer | PrinterExtension; }) {
    const newPrinterSet: PrinterSet = Object.assign(Object.create(null), this);

    for (let key in extension) {
        const typePrinter = extension[key];

        if (!typePrinter || typeof typePrinter !== 'object') {
            continue;
        }

        if (hasOwnProperty.call(newPrinterSet, key)) {
            const existing = newPrinterSet[key];
            newPrinterSet[key] = existing && typeof existing.fork === 'function'
                ? existing.fork(extension[key])
                : existing;
        } else {
            newPrinterSet[key] = createPrinter(extension[key]);
        }
    }

    newPrinterSet.fork = forkPrinterSet.bind(newPrinterSet);

    return newPrinterSet;
}

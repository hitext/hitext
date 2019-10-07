function createPrinter(base) {
    return forkPrinter.call(null, base);
}

function forkPrinter(extension) {
    const base = this === global ? {} : this || {};
    const newPrinter = {};

    Object.assign(newPrinter, base, extension, {
        fork: forkPrinter.bind(newPrinter),
        ranges: Object.assign({}, base.ranges, extension && extension.ranges)
    });

    if (typeof newPrinter.createHook !== 'function') {
        newPrinter.createHook = fn => fn();
    }

    return newPrinter;
}

function forkPrinterSet(extension) {
    const newPrinterSet = Object.assign({}, this);

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
};

module.exports = {
    createPrinter,
    forkPrinter,
    forkPrinterSet
};

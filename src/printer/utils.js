const globalThis = (function() {
    if (typeof self !== 'undefined') {
        return self;   // eslint-disable-line no-undef
    }
    if (typeof window !== 'undefined') {
        return window; // eslint-disable-line no-undef
    }
    if (typeof global !== 'undefined') {
        return global;
    }
}());

function composePrinters(...extensions) {
    return extensions.reduce((result, current) => result.fork(current), createPrinter());
}

function createPrinter(base) {
    return forkPrinter.call(null, base);
}

function forkPrinter(extension) {
    const newPrinter = {};
    const base = this === globalThis ? {} : this || {};

    return Object.assign(newPrinter, base, extension, {
        fork: forkPrinter.bind(newPrinter),
        ranges: Object.assign({}, base.ranges, extension ? extension.ranges : null)
    });
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
    composePrinters,
    createPrinter,
    forkPrinter,
    forkPrinterSet
};

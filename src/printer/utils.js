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
    const base = this === globalThis ? {} : this || {};
    const ranges = Object.assign({}, base.ranges);
    const newPrinter = {};

    Object.assign(newPrinter, base, extension, {
        fork: forkPrinter.bind(newPrinter),
        ranges
    });

    if (typeof newPrinter.createHook !== 'function') {
        newPrinter.createHook = () => {};
    }

    if (extension && extension.ranges) {
        [].concat(
            Object.getOwnPropertyNames(extension.ranges),
            Object.getOwnPropertySymbols(extension.ranges)
        ).forEach(key => {
            ranges[key] = typeof extension.ranges[key] === 'function'
                ? newPrinter.createHook(extension.ranges[key])
                : extension.ranges[key];
        });
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
    composePrinters,
    createPrinter,
    forkPrinter,
    forkPrinterSet
};

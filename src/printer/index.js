const noop = require('./noop');

module.exports = {
    noop,
    html: require('./html'),
    tty: require('./tty'),

    compose(...extensions) {
        return extensions.reduce((result, current) => result.fork(current), noop);
    },
    fork(extenstion) {
        const newPrinterSet = Object.assign({}, this);

        for (let key in extenstion) {
            const typePrinter = extenstion[key];

            if (!typePrinter || typeof typePrinter !== 'object') {
                continue;
            }

            if (hasOwnProperty.call(newPrinterSet, key)) {
                const existing = newPrinterSet[key];
                newPrinterSet[key] = existing && typeof existing.fork === 'function'
                    ? existing.fork(extenstion[key])
                    : existing;
            } else {
                newPrinterSet[key] = noop.fork(extenstion[key]);
            }
        }

        return newPrinterSet;
    }
};

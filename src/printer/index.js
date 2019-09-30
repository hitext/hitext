const { forkPrinterSet } = require('./utils');

module.exports = forkPrinterSet.call({}, {
    noop: require('./noop'),
    html: require('./html'),
    tty: require('./tty')
});

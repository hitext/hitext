const noop = require('./noop');

module.exports = {
    noop,
    html: require('./html'),
    tty: require('./tty'),
    compose(...extensions) {
        return extensions.reduce((result, current) => result.fork(current), noop);
    }
};

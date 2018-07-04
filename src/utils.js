const noop = function() {};

function ensureFunction(value, alt) {
    return typeof value === 'function' ? value : alt || noop;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

module.exports = {
    ensureFunction,
    ensureArray
};

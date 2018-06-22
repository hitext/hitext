function ensureFunction(value, alt) {
    return typeof value === 'function' ? value : alt;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

module.exports = {
    ensureFunction,
    ensureArray
};

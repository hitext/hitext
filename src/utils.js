const noop = function() {};

function ensureFunction(value, alt) {
    return typeof value === 'function' ? value : alt || noop;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function match(source, origRx, cb) {
    const flags = origRx.flags.indexOf('g') !== -1 ? origRx.flags : origRx.flags + 'g';
    const rx = new RegExp(origRx, flags);
    let m;

    while (m = rx.exec(source)) {
        cb(m.index, m.index + m[0].length, m);
    }
}

module.exports = {
    ensureFunction,
    ensureArray,
    match
};

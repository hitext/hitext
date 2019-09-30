function newLineLength(source, i) {
    switch (source.charCodeAt(i)) {
        default:
            return 0;

        case 0x0a: // \n
            return 1;

        case 0x0d: // \r
            return i + 1 < source.length && source.charCodeAt(i + 1) === 0x0a
                ? 2  // \r\n
                : 1; // \r
    }
}

module.exports = {
    newLineLength
};

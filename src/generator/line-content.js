const { newLineLength } = require('./utils');

module.exports = (source, createRange) => {
    let line = 1;
    let lineStart = 0;

    for (let i = 0; i < source.length; i++) {
        const nl = newLineLength(source, i);

        if (nl !== 0) {
            createRange(lineStart, i, line++);
            lineStart = i + nl;
            i += nl - 1;
        }
    }

    createRange(lineStart, source.length, line++);
};

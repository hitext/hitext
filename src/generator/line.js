const { newLineLength } = require('./utils');

module.exports = (source, addRange) => {
    let line = 1;
    let lineStart = 0;

    for (let i = 0; i < source.length; i++) {
        const nl = newLineLength(source, i);

        if (nl !== 0) {
            addRange('line', lineStart, i + nl, line++);
            lineStart = i + nl;
            i += nl - 1;
        }
    }

    addRange('line', lineStart, source.length, line++);
};

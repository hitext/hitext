const { newLineLength } = require('./utils');

module.exports = (source, createRange) => {
    let line = 1;

    for (let i = 0; i < source.length; i++) {
        const nl = newLineLength(source, i);

        if (nl !== 0) {
            createRange(i, i + nl, line++);
            i += nl - 1;
        }
    }
};

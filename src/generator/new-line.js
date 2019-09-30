const { newLineLength } = require('./utils');

module.exports = (source, addRange) => {
    let line = 1;

    for (let i = 0; i < source.length; i++) {
        const nl = newLineLength(source, i);

        if (nl !== 0) {
            addRange('new-line', i, i + 1, line++);
            i += nl - 1;
        }
    }
};

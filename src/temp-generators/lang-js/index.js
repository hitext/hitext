const acorn = require('acorn-jsx');
const walk = require('./acorn-jsx-walker')(require('acorn/dist/walk'));

module.exports = (...generators) => (source, addRange) => {
    let ast = null;
    const tokens = [];
    const comments = [];
    const parser = new acorn.Parser({
        ranges: true,
        plugins: { jsx: true },
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        onComment: (isBlock, value, start, end) => comments.push({ isBlock, value, start, end }),
        onToken: (token) => tokens.push({ token, context: parser.curContext() })
    }, source);

    try {
        ast = parser.parse();
    } catch (e) {
        return;
    }

    generators.forEach(generator =>
        generator({
            ast: ast || {},
            tokens,
            comments,
            addRange,
            walk
        })
    );
};

module.exports.syntax = require('./syntax');
module.exports.dataUri = require('./data-uri');

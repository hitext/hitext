const { createPrinter } = require('./utils');

module.exports = createPrinter({
    print: chunk => chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
});

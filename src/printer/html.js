const ensureArray = require('../utils').ensureArray;

module.exports = {
    target: 'html',

    escape: chunk => chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'),

    finalize: (result, decorators) => {
        const style = ensureArray(decorators).map(decorator => decorator.style).filter(Boolean).join('\n');

        result = `<div>${result}</div>`;

        if (style) {
            result = `<style>\n${style}\n</style>\n${result}`;
        }

        return result;
    }
};

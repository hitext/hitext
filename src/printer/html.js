module.exports = {
    target: 'html',

    escape: chunk => chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'),

    finalize(result) {
        const style = Object.keys(this.hooks).map(hook => hook.style).filter(Boolean).join('\n');

        result = `<div>${result}</div>`;

        if (style) {
            result = `<style>\n${style}\n</style>\n${result}`;
        }

        return result;
    },

    hooks: {
        syntax: {
            style: [
                '.token.keyword,.token.attr-value{color:#07a}',
                '.token.string{color:#690;word-break:break-all}',
                '.token.punctuator{color:#999}',
                '.token.num,.token.value-keyword,.token.jsx-open-tag,.token.jsx-close-tag{color:#905}',
                '.token.jsx-attr-name{color:#690}',
                '.token.regexp{color:#e90}',
                '.token.comment{color:slategray}'
            ].join('\n'),
            open: (data) => {
                return '<span class="token ' + data + '">';
            },
            close: () => {
                return '</span>';
            }
        },
        shortener: {
            style: [
                '.data-uri .payload{display:none}',
                '.data-uri::before{content: "...(" attr(data-length) " chars)..."}'
            ].join('\n'),
            open: (len) => {
                return `<span class="data-uri" data-length="${len}"><span class="payload">`;
            },
            close: () => {
                return '</span></span>';
            }
        }
    }
};

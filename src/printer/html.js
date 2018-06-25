module.exports = {
    target: 'html',

    escape: chunk => chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'),

    finalize(result) {
        const style = Object.keys(this.hooks)
            .map(type => this.hooks[type] && this.hooks[type].style)
            .filter(Boolean)
            .join('\n');

        result = `<div>${result}</div>`;

        if (style) {
            result = `<style>\n${style}\n</style>\n${result}`;
        }

        return result;
    },

    hooks: {
        syntax: {
            style: [
                '.syntax--keyword,.syntax--attr-value{color:#07a}',
                '.syntax--string{color:#690;word-break:break-all}',
                '.syntax--punctuator{color:#999}',
                '.syntax--num,.syntax--value-keyword,.syntax--jsx-open-tag,.syntax--jsx-close-tag{color:#905}',
                '.syntax--jsx-attr-name{color:#690}',
                '.syntax--regexp{color:#e90}',
                '.syntax--comment{color:slategray}'
            ].join('\n'),
            open: (data) => {
                return '<span class="syntax--' + data + '">';
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

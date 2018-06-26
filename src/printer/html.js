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

        return `<style>\n${style}\n</style>\n<div>${result}</div>`;
    },

    hooks: {
        syntax: {
            style: [
                '.syntax--keyword,.syntax--attr-value{color:#07a}',
                '.syntax--string{color:#690;word-break:break-all}',
                '.syntax--punctuator{color:#999}',
                '.syntax--number,.syntax--value-keyword,.syntax--tag{color:#905}',
                '.syntax--attr-name{color:#690}',
                '.syntax--regexp{color:#e90}',
                '.syntax--comment{color:slategray}'
            ].join('\n'),
            open: (data) => '<span class="syntax--' + data + '">',
            close: () => '</span>'
        },
        spotlight: {
            style: [
                '.spotlight{background:#fdf8cc}'
            ].join('\n'),
            open: () => '<span class="spotlight">',
            close: () => '</span>'
        },
        shortener: {
            style: [
                '.data-uri .payload{display:none}',
                '.data-uri::before{content: "...(" attr(data-length) " chars)..."}'
            ].join('\n'),
            open: (data) => `<span class="data-uri" data-length="${data}"><span class="payload">`,
            close: () => '</span></span>'
        }
    }
};

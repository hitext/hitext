module.exports = {
    start() {
        return '<div>';
    },
    finish() {
        return '</div>';
    },

    print: chunk => chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;'),

    hooks: {
        syntax: {
            open: (data) => '<span class="syntax--' + data + '">',
            close: () => '</span>'
        },
        spotlight: {
            open: () => '<span class="spotlight">',
            close: () => '</span>'
        },
        match: {
            open: () => '<span class="match">',
            close: () => '</span>'
        }
    }
};

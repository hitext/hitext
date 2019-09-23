module.exports = {
    fork: require('./fork'),

    start() {
        return '';
    },
    finish() {
        return '';
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

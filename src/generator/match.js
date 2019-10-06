module.exports = function(pattern) {
    if (pattern instanceof RegExp) {
        const flags = pattern.flags.indexOf('g') !== -1 ? pattern.flags : pattern.flags + 'g';
        const matchRx = new RegExp(pattern, flags);

        return function(source, createRange) {
            let match;

            while (match = matchRx.exec(source)) {
                createRange(match.index, match.index + match[0].length);
            }
        };
    }

    pattern = String(pattern);
    return function(source, createRange) {
        let index = -1;

        while (true) {
            index = source.indexOf(pattern, index + 1);

            if (index === -1) {
                break;
            }

            createRange(index, index + pattern.length);
        }
    };
};

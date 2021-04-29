export default function(pattern: string | RegExp) {
    if (pattern instanceof RegExp) {
        const flags = pattern.flags.indexOf('g') !== -1 ? pattern.flags : pattern.flags + 'g';
        const matchRx = new RegExp(pattern, flags);

        return function(source: string, createRange: (start: number, end: number) => void) {
            let match: RegExpExecArray;

            while (match = matchRx.exec(source)) {
                createRange(match.index, match.index + match[0].length);
            }
        };
    }

    pattern = String(pattern);
    return function(source: string, createRange: (start: number, end: number) => void) {
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

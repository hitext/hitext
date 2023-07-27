export default function(pattern: RegExp | string) {
    if (pattern instanceof RegExp) {
        const flags = pattern.flags.indexOf('g') !== -1 ? pattern.flags : pattern.flags + 'g';
        const matchRx = new RegExp(pattern, flags);

        return function(source: string, createRange: (start: number, end: number) => void) {
            let match: ReturnType<RegExp['exec']>;

            while (match = matchRx.exec(source)) {
                createRange(match.index, match.index + match[0].length);
            }
        };
    }

    const patternStr = String(pattern);

    return function(source: string, createRange: (start: number, end: number) => void) {
        let index = -1;

        while (true) {
            index = source.indexOf(patternStr, index + 1);

            if (index === -1) {
                break;
            }

            createRange(index, index + patternStr.length);
        }
    };
};

import { GenerateRanges } from '../types.js';

// Overload: when pattern is RegExp, Data is RegExpExecArray
export function rangeMatch<RenderOptions>(pattern: RegExp): GenerateRanges<RegExpExecArray, RenderOptions>;
// Overload: when pattern is string, Data is string
export function rangeMatch<RenderOptions>(pattern: string): GenerateRanges<string, RenderOptions>;
// Implementation signature (not visible to consumers)
export function rangeMatch<RenderOptions>(
    pattern: RegExp | string
): GenerateRanges<any, RenderOptions> {
    if (pattern instanceof RegExp) {
        const flags = pattern.flags.indexOf('g') !== -1 ? pattern.flags : pattern.flags + 'g';
        const matchRx = new RegExp(pattern, flags);

        return function(source, createRange) {
            let match: ReturnType<RegExp['exec']>;

            while (match = matchRx.exec(source)) {
                createRange(
                    match.index,
                    match.index + match[0].length,
                    match
                );
            }
        };
    }

    const patternStr = String(pattern);

    return function(source, createRange) {
        let index = -1;

        while (true) {
            index = source.indexOf(patternStr, index + 1);

            if (index === -1) {
                break;
            }

            createRange(index, index + patternStr.length, patternStr);
        }
    };
}

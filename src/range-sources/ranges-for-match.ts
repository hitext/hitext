import { GenerateRanges } from '../types.js';

/**
 * Creates a range generator that finds all occurrences matching a pattern.
 *
 * For string patterns, finds all occurrences of the literal string in the document.
 * For RegExp patterns, respects the 'g' (global) flag:
 * - With 'g' flag: finds all matches
 * - Without 'g' flag: finds only the first match
 *
 * @param pattern - String literal or RegExp to search for
 * @returns A GenerateRanges function that creates ranges for each match
 *
 * The data stored in each range depends on the pattern type:
 * - For string patterns: The matched string
 * - For RegExp patterns: The full RegExpExecArray (includes capture groups)
 *
 * @example
 * rangesForMatch('error')
 *
 * @example
 * rangesForMatch(/\w+/g)
 *
 * @example
 * rangesForMatch(/function\s+(\w+)/g)
 */
export function rangesForMatch<RenderOptions>(pattern: RegExp): GenerateRanges<RegExpExecArray, RenderOptions>;
export function rangesForMatch<RenderOptions>(pattern: string): GenerateRanges<string, RenderOptions>;
export function rangesForMatch<RenderOptions>(
    pattern: RegExp | string
): GenerateRanges<any, RenderOptions> {
    if (pattern instanceof RegExp) {
        const isGlobal = pattern.flags.includes('g');

        return function(document, createRange) {
            let match: ReturnType<RegExp['exec']>;

            while (match = pattern.exec(document)) {
                createRange(
                    match.index,
                    match.index + match[0].length,
                    match
                );

                if (!isGlobal) {
                    break;
                }
            }
        };
    }

    const patternStr = String(pattern);

    return function(document, createRange) {
        let index = -1;

        while (true) {
            index = document.indexOf(patternStr, index + 1);

            if (index === -1) {
                break;
            }

            createRange(index, index + patternStr.length, patternStr);
        }
    };
}

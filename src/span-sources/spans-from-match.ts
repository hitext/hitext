import { GenerateSpans } from '../types.js';

/**
 * Creates a span generator that finds all occurrences matching a pattern.
 *
 * For string patterns, finds all occurrences of the literal string in the document.
 * For RegExp patterns, respects the 'g' (global) flag:
 * - With 'g' flag: finds all matches
 * - Without 'g' flag: finds only the first match
 * Zero-width patterns produce point spans and advance between repeated matches.
 * RegExp state is isolated from the supplied pattern and reset for each generation.
 *
 * @param pattern - String literal or RegExp to search for
 * @returns A GenerateSpans function that creates spans for each match
 *
 * The data stored in each span depends on the pattern type:
 * - For string patterns: The matched string
 * - For RegExp patterns: The full RegExpExecArray (includes capture groups)
 *
 * @example
 * spansFromMatch('error')
 *
 * @example
 * spansFromMatch(/\w+/g)
 *
 * @example
 * spansFromMatch(/function\s+(\w+)/g)
 */
export function spansFromMatch<RenderOptions>(pattern: RegExp): GenerateSpans<RegExpExecArray, RenderOptions>;
export function spansFromMatch<RenderOptions>(pattern: string): GenerateSpans<string, RenderOptions>;
export function spansFromMatch<RenderOptions>(
    pattern: RegExp | string
): GenerateSpans<any, RenderOptions> {
    if (pattern instanceof RegExp) {
        return function(document, createSpan) {
            const regexp = new RegExp(pattern.source, pattern.flags);
            const isGlobal = regexp.global;
            const isUnicode = regexp.flags.includes('u') || regexp.flags.includes('v');
            let match: ReturnType<RegExp['exec']>;

            while (match = regexp.exec(document)) {
                createSpan(
                    match.index,
                    match.index + match[0].length,
                    match
                );

                if (!isGlobal) {
                    break;
                }

                if (match[0].length === 0) {
                    const codePoint = document.codePointAt(regexp.lastIndex);
                    regexp.lastIndex += isUnicode && codePoint !== undefined && codePoint > 0xFFFF ? 2 : 1;
                }
            }
        };
    }

    const patternStr = String(pattern);

    return function(document, createSpan) {
        if (patternStr.length === 0) {
            for (let index = 0; index <= document.length; index++) {
                createSpan(index, index, patternStr);
            }

            return;
        }

        let index = -1;

        while (true) {
            index = document.indexOf(patternStr, index + 1);

            if (index === -1) {
                break;
            }

            createSpan(index, index + patternStr.length, patternStr);
        }
    };
}

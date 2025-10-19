import type { GenerateRanges, Ranges } from '../types.js';
import { generateRanges } from '../ranges.js';
import { rangeMerge } from './merge.js';

/**
 * Inverts ranges - returns ranges covering all areas NOT included in the input ranges.
 *
 * @param input - Ranges to invert
 * @param exact - If true, inverted ranges are bounded by [0, source.length].
 *                If false (default), inverted ranges extend to [0, source.length + 1]
 *                to ensure edge content can be replaced in viewports.
 *
 * @example
 * // Invert matches to create viewport gaps (default extended range)
 * rangeInvert(rangeMatch(/error/g))
 *
 * @example
 * // Invert with exact source boundaries
 * rangeInvert(rangeMatch(/error/g), true)
 */
export function rangeInvert<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    exact = false
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const ranges = generateRanges(source, rangeMerge(input), Symbol('temp'), renderOptions);
        let offset = 0;

        for (const range of ranges) {
            if (offset !== range.start) {
                createRange(offset, range.start);
            }

            offset = range.end;
        }

        // Create remaining range if there's content before source.length,
        // or if source is empty and we want extended boundaries
        if (offset < source.length) {
            createRange(offset, source.length + (exact ? 0 : 1));
        }
    };
}

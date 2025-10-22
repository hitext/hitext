import type { Ranges, TransformRanges } from '../types.js';
import { generateRanges } from '../ranges.js';
import { applyMerge } from './apply-merge.js';

/**
 * Inverts ranges (curried transformer) - returns ranges covering all areas NOT included in the input ranges.
 *
 * @param exact - If true, inverted ranges are bounded by [0, source.length].
 *                If false (default), inverted ranges extend to [0, source.length + 1]
 *                to ensure edge content can be replaced in viewports.
 * @returns A transformer function that accepts ranges and returns inverted ranges
 *
 * @example
 * // Invert matches to create viewport gaps (default extended range)
 * composeRanges(
 *   rangesForMatch(/error/g),
 *   applyInvert()
 * )
 *
 * @example
 * // Invert with exact source boundaries
 * composeRanges(
 *   rangesForMatch(/error/g),
 *   applyInvert(true)
 * )
 */
export function applyInvert<Data, RenderOptions>(
    exact = false
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, context) => {
            const ranges = generateRanges(source, applyMerge<Data, RenderOptions>()(input), context);
            
            // If no input ranges, return empty (don't invert to entire document)
            if (ranges.length === 0) {
                return;
            }
            
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
    };
}

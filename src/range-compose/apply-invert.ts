import type { Ranges, TransformRanges } from '../types.js';
import { generateRanges } from '../ranges.js';
import { applyMerge } from './apply-merge.js';

/**
 * Inverts ranges (curried transformer) - returns ranges covering all areas NOT included in the input ranges.
 *
 * @param exact - If true, inverted ranges are bounded by [0, document.length].
 *                If false (default), inverted ranges extend to [0, document.length + 1]
 *                to ensure edge content can be replaced in viewports.
 * @returns A transformer function that accepts ranges and returns inverted ranges
 *
 * @example
 * composeRanges(
 *   ...,
 *   applyInvert()
 * )
 */
export function applyInvert<Data, RenderOptions>(
    exact = false
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            const ranges = generateRanges(document, applyMerge<Data, RenderOptions>()(input), context);

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

            // Create remaining range if there's content before document.length,
            // or if document is empty and we want extended boundaries
            if (offset < document.length) {
                createRange(offset, document.length + (exact ? 0 : 1));
            }
        };
    };
}

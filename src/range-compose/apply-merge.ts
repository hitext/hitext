import type { Ranges, TransformRanges } from '../types.js';
import { generateRanges } from '../ranges.js';

/**
 * Merges overlapping or adjacent ranges into continuous regions (curried transformer).
 *
 * Preserves the array of merged ranges in the origin field, which allows you to
 * access the individual ranges that were combined. This is useful for:
 * - Generating summaries (e.g., table of contents from merged headers)
 * - Tracking what was merged together for further processing
 * - Maintaining data from individual ranges after merging positions
 *
 * @returns A transformer function that accepts ranges and returns merged ranges
 *
 * @example
 * composeRanges(
 *   ...,
 *   applyExpandTo('line'),
 *   applyMerge()
 * )
 */
export function applyMerge<Data, RenderOptions>(): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, context) => {
            const sortedRanges = generateRanges(source, input, context)
                .sort((a, b) => a.start - b.start || a.end - b.end);

            let firstIndex = 0;
            let lastIndex = 0;

            // Helper to create a merged range with origin tracking
            const createMergedRange = (start: number, end: number) => {
                const origin = sortedRanges.slice(firstIndex, lastIndex + 1).map(
                    ({ start, end, data, origin }) => ({ start, end, data, origin })
                );
                createRange(start, end, undefined, origin);
            };

            if (sortedRanges.length > 0) {
                let end = sortedRanges[firstIndex].end;

                for (let i = 1; i < sortedRanges.length; i++) {
                    const range = sortedRanges[i];

                    if (range.start <= end) {
                        lastIndex = i;
                        end = Math.max(range.end, end);
                    } else {
                        createMergedRange(sortedRanges[firstIndex].start, end);
                        firstIndex = lastIndex = i;
                        end = range.end;
                    }
                }

                createMergedRange(sortedRanges[firstIndex].start, end);
            }
        };
    };
}

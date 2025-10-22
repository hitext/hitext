import type { GenerateRanges, Ranges } from '../types.js';
import { generateRanges } from '../ranges.js';

/**
 * Merges overlapping or adjacent ranges (curried transformer).
 *
 * @param origins - If true, preserve information about merged ranges in the origin field (default: false)
 * @returns A transformer function that accepts ranges and returns merged ranges
 *
 * @example
 * // Merge overlapping matches
 * composeRanges(
 *   rangesForMatch(/\w+/g),
 *   applyMerge()
 * )
 *
 * @example
 * // Merge with origin tracking
 * composeRanges(
 *   rangesForMatch(/error/g),
 *   applyMerge(true)
 * )
 */
export function applyMerge<Data, RenderOptions>(
    origins = false
): (input: Ranges<Data, RenderOptions>) => GenerateRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, context) => {
            const sortedRanges = generateRanges(source, input, context)
                .sort((a, b) => a.start - b.start || a.end - b.end);
            const getOrigin = () => sortedRanges.slice(firstIndex, lastIndex + 1).map(
                ({ start, end, data, origin }) => ({ start, end, data, origin })
            );
            let firstIndex = 0;
            let lastIndex = 0;

            if (sortedRanges.length > 0) {
                let end = sortedRanges[firstIndex].end;

                for (let i = 1; i < sortedRanges.length; i++) {
                    const range = sortedRanges[i];

                    if (range.start <= end) {
                        lastIndex = i;
                        end = Math.max(range.end, end);
                    } else {
                        createRange(sortedRanges[firstIndex].start, end, undefined, origins ? getOrigin() : undefined);
                        firstIndex = lastIndex = i;
                        end = range.end;
                    }
                }

                createRange(sortedRanges[firstIndex].start, end, undefined, origins ? getOrigin() : undefined);
            }
        };
    };
}

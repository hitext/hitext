import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Combines multiple range sources into a single flat list of ranges.
 * Unlike applyMerge, this does not merge overlapping ranges - it simply
 * collects all ranges from all sources in the order they are provided.
 *
 * This is useful when you want to apply the same transformation to ranges
 * from different sources (e.g., different regex patterns) while keeping
 * them as separate ranges.
 *
 * @param inputs - Range sources to combine
 * @returns A GenerateRanges function that yields all ranges from all sources
 *
 * @example
 * concatRanges(
 *   rangesForMatch(/ERROR/g),
 *   rangesForMatch(/WARNING/g)
 * )
 */
export function concatRanges<Data, RenderOptions>(
    ...inputs: Array<Ranges<Data, RenderOptions>>
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        // Process each input directly, combining all ranges in order
        for (const input of inputs) {
            processRanges(source, input, createRange, context);
        }
    };
}

import { processRanges } from '../ranges.js';
import type { GenerateRanges, Ranges } from '../types.js';

/**
 * Creates a range generator that tries multiple inputs in order, using the first one that produces ranges.
 *
 * This is useful for providing fallback behavior when range sources may yield no results.
 * Each input is tried in order until one produces ranges, or all inputs are exhausted.
 *
 * @param inputs - Range sources to try in order (generator functions or iterables)
 * @returns A GenerateRanges function that tries each input until one produces ranges
 *
 * @example
 * // Try multiple patterns with final fallback
 * coalesceRanges(
 *     rangesForMatch(/error/gi),
 *     rangesForMatch(/warning/gi),
 *     [[0, 100]]  // Show first 100 chars if no errors or warnings
 * )
 *
 * @example
 * // Select insertion point with fallbacks
 * coalesceRanges(
 *     rangesFromOptions('tocInsertPoint'),
 *     rangesForMatch(/<!-- TOC -->/),
 *     [[0, 0]]  // Document start as final fallback
 * )
 *
 * @example
 * // Placeholder for missing content
 * coalesceRanges(
 *     rangesForMatch(/^(?=#[^#])/m),  // Start of first H1
 *     [[0, 0]]  // Document start
 * )
 */
export function coalesceRanges<Data = unknown, RenderOptions = unknown>(
    ...inputs: Ranges<Data, RenderOptions>[]
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        // Try each input in order until one produces ranges
        for (const input of inputs) {
            let hasRanges = false;

            processRanges(
                source,
                input,
                (start, end, data, origin) => {
                    hasRanges = true;
                    createRange(start, end, data, origin);
                },
                context
            );

            // If this input produced ranges, we're done
            if (hasRanges) {
                break;
            }
        }
    };
}

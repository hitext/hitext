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
 * rangesWithFallback(
 *   rangesForMatch(/error/gi),
 *   rangesForMatch(/warning/gi),
 *   [[0, 100]]
 * )
 */
export function rangesWithFallback<Data = unknown, RenderOptions = unknown>(
    ...inputs: Ranges<Data, RenderOptions>[]
): GenerateRanges<Data, RenderOptions> {
    return (document, createRange, context) => {
        // Try each input in order until one produces ranges
        for (const input of inputs) {
            let hasRanges = false;

            processRanges(
                document,
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

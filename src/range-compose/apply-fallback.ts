import type { Ranges, TransformRanges } from '../types.js';
import { rangesWithFallback } from '../range-sources/ranges-with-fallback.js';

/**
 * Provides fallback ranges when input produces no results (curried transformer).
 *
 * This is useful for ensuring a result when the primary range source might be empty.
 * If the input produces ranges, they are used. Otherwise, fallbacks are tried in order.
 *
 * @param fallbacks - Fallback range sources to try in order if input is empty
 * @returns A transformer function that provides fallbacks when input is empty
 *
 * @example
 * // Show errors, or warnings if no errors, or first 100 chars if nothing found
 * composeRanges(
 *     rangesForMatch(/error/gi),
 *     applyFallback(
 *         rangesForMatch(/warning/gi),
 *         [[0, 100]]
 *     )
 * )
 *
 * @example
 * // Insert TOC at custom marker, or before first H1, or at document start
 * composeRanges(
 *     rangesFromOptions('tocInsertPoint'),
 *     applyFallback(
 *         rangesForMatch(/^(?=#[^#])/m),
 *         [[0, 0]]
 *     )
 * )
 */
export function applyFallback<Data, RenderOptions>(
    ...fallbacks: Ranges<Data, RenderOptions>[]
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return rangesWithFallback<Data, RenderOptions>(input, ...fallbacks);
    };
}

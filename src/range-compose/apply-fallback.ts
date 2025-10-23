import type { Ranges, TransformRanges } from '../types.js';
import { rangesWithFallback } from '../range-sources/ranges-with-fallback.js';

/**
 * Provides fallback ranges when input produces no results (curried transformer).
 *
 * This is useful for ensuring a result when the primary range generator might be empty.
 * If the input produces ranges, they are used. Otherwise, fallbacks are tried in order.
 *
 * @param fallbacks - Fallback range sources to try in order if input is empty
 * @returns A transformer function that provides fallbacks when input is empty
 *
 * @example
 * rangesCompose(
 *   rangesForMatch(/error/gi),
 *   applyFallback(
 *     rangesForMatch(/warning/gi),
 *     [[0, 100]]
 *   )
 * )
 */
export function applyFallback<Data, RenderOptions>(
    ...fallbacks: Ranges<Data, RenderOptions>[]
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return rangesWithFallback<Data, RenderOptions>(input, ...fallbacks);
    };
}

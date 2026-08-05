import type { SpansSource, TransformSpans } from '../types.js';
import { spansWithFallback } from '../span-sources/spans-with-fallback.js';

/**
 * Provides fallback spans when input produces no results (curried transformer).
 *
 * This is useful for ensuring a result when the primary span generator might be empty.
 * If the input produces spans, they are used. Otherwise, fallbacks are tried in order.
 *
 * @param fallbacks - Fallback span sources to try in order if input is empty
 * @returns A transformer function that provides fallbacks when input is empty
 *
 * @example
 * spansCompose(
 *   spansFromMatch(/error/gi),
 *   applyFallback(
 *     spansFromMatch(/warning/gi),
 *     [[0, 100]]
 *   )
 * )
 */
export function applyFallback<Data, RenderOptions>(
    ...fallbacks: SpansSource<Data, RenderOptions>[]
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return spansWithFallback<Data, RenderOptions>(input, ...fallbacks);
    };
}

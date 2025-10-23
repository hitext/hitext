import type { GenerateRanges, Ranges } from '../types.js';

/**
 * Composes a range source with multiple transformers (left-to-right composition).
 *
 * @param source - The initial range source
 * @param transformers - Transformer functions to apply in sequence
 * @returns The final composed GenerateRanges function
 *
 * @example
 * composeRanges(
 *   rangesForMatch(/error/g),
 *   applyCollapseTo('start'),
 *   applyMerge()
 * )
 */
export function composeRanges<Data, RenderOptions>(
    source: Ranges<Data, RenderOptions>,
    ...transformers: Array<(input: Ranges<any, RenderOptions>) => GenerateRanges<any, RenderOptions>>
): GenerateRanges<Data, RenderOptions> {
    // Reduce transformers: each takes previous output as input
    return transformers.reduce(
        (acc, transformer) => transformer(acc),
        source as GenerateRanges<any, RenderOptions>
    ) as GenerateRanges<Data, RenderOptions>;
}

import type { GenerateRanges, Ranges } from '../types.js';

/**
 * Composes a range generator with multiple transformers (left-to-right composition).
 *
 * @param rangeInput - The initial range generator
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
    rangeInput: Ranges<Data, RenderOptions>,
    ...transformers: Array<(input: Ranges<any, RenderOptions>) => GenerateRanges<any, RenderOptions>>
): GenerateRanges<Data, RenderOptions> {
    // Reduce transformers: each takes previous output as input
    return transformers.reduce(
        (acc, transformer) => transformer(acc),
        rangeInput as GenerateRanges<any, RenderOptions>
    ) as GenerateRanges<Data, RenderOptions>;
}

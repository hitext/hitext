import type { GenerateSpans, SpansSource } from '../types.js';

/**
 * Composes a span generator with multiple transformers (left-to-right composition).
 *
 * @param spanInput - The initial span generator
 * @param transformers - Transformer functions to apply in sequence
 * @returns The final composed GenerateSpans function
 *
 * @example
 * spansCompose(
 *   spansFromMatch(/error/g),
 *   applyCollapseTo('start'),
 *   applyMerge()
 * )
 */
export function spansCompose<Data, RenderOptions>(
    spanInput: SpansSource<Data, RenderOptions>,
    ...transformers: Array<(input: SpansSource<any, RenderOptions>) => GenerateSpans<any, RenderOptions>>
): GenerateSpans<Data, RenderOptions> {
    // Reduce transformers: each takes previous output as input
    return transformers.reduce(
        (acc, transformer) => transformer(acc),
        spanInput as GenerateSpans<any, RenderOptions>
    ) as GenerateSpans<Data, RenderOptions>;
}

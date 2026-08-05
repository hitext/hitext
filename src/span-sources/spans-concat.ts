import type { GenerateSpans, SpansSource } from '../types.js';
import { processSpans } from '../spans.js';

/**
 * Combines multiple span sources into a single flat list of spans.
 * Unlike applyMerge, this does not merge overlapping spans - it simply
 * collects all spans from all sources in the order they are provided.
 *
 * This is useful when you want to apply the same transformation to spans
 * from different sources (e.g., different regex patterns) while keeping
 * them as separate spans.
 *
 * @param inputs - Span sources to combine
 * @returns A GenerateSpans function that yields all spans from all sources
 *
 * @example
 * spansConcat(
 *   spansFromMatch(/ERROR/g),
 *   spansFromMatch(/WARNING/g)
 * )
 */
export function spansConcat<Data, RenderOptions>(
    ...inputs: Array<SpansSource<Data, RenderOptions>>
): GenerateSpans<Data, RenderOptions> {
    return (document, createSpan, context) => {
        // Process each input directly, combining all spans in order
        for (const input of inputs) {
            processSpans(document, input, createSpan, context);
        }
    };
}

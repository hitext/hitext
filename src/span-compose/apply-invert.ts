import type { SpansSource, TransformSpans } from '../types.js';
import { generateSpans } from '../spans.js';
import { applyMerge } from './apply-merge.js';

/**
 * Inverts spans (curried transformer) - returns spans covering all areas NOT included in the input spans.
 *
 * @param exact - If true, inverted spans are bounded by [0, document.length].
 *                If false (default), inverted spans extend to [0, document.length + 1]
 *                to ensure edge content can be replaced in viewports.
 * @returns A transformer function that accepts spans and returns inverted spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyInvert()
 * )
 */
export function applyInvert<Data, RenderOptions>(
    exact = false
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            const spans = generateSpans(document, applyMerge<Data, RenderOptions>()(input), context);

            // If no input spans, return empty (don't invert to entire document)
            if (spans.length === 0) {
                return;
            }

            let offset = 0;

            for (const span of spans) {
                if (offset !== span.start) {
                    createSpan(offset, span.start);
                }

                offset = span.end;
            }

            // Create remaining span if there's content before document.length,
            // or if document is empty and we want extended boundaries
            if (offset < document.length) {
                createSpan(offset, document.length + (exact ? 0 : 1));
            }
        };
    };
}

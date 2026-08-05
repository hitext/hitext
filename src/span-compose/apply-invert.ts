import type { SpansSource, TransformSpans } from '../types.js';
import { generateSpans } from '../spans.js';
import { applyMerge } from './apply-merge.js';

/**
 * Emits gaps between sorted, merged input spans (curried transformer).
 * Empty input produces no spans. Outputs have undefined data and no origin.
 *
 * @param exact - Whether a trailing gap ends at document.length. When false
 * (default), an existing trailing gap ends at document.length + 1.
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
): TransformSpans<Data, RenderOptions, undefined> {
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

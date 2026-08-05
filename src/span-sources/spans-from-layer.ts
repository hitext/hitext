import type { GenerateSpans } from '../types.js';
import { processSpans } from '../spans.js';

/**
 * Creates a spans generator that retrieves spans from a named layer in the context.
 *
 * This function allows you to reference spans from a previously processed layer
 * by its name. The spans are looked up from the `spansByName` map in the context.
 *
 * @param name - The name of the layer to retrieve spans from
 * @returns A generator function that yields spans from the named layer
 *
 * @example
 * pipeline
 *   .addLayer(spansFromMatch(/error/g), highlight, 'errors')
 *   .addLayer(spansFromLayer('errors'), underline)
 *
 * @example
 * pipeline.addLayer(
 *   spansCompose(
 *     spansFromLayer('matches'),
 *     applyExpandTo('line')
 *   ),
 *   fadeOut
 * )
 */
export function spansFromLayer<Data = unknown, RenderOptions = unknown>(
    name: string
): GenerateSpans<Data, RenderOptions> {
    return (document, createSpan, context) => {
        // Get spans from the spansByName map
        const spans = context?.spansByName?.[name];

        if (!spans) {
            // No spans found for this name - do nothing
            return;
        }

        // Process the spans from the layer
        processSpans(
            document,
            spans,
            createSpan,
            context
        );
    };
}

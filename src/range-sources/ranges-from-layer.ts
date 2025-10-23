import type { GenerateRanges } from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Creates a ranges generator that retrieves ranges from a named layer in the context.
 *
 * This function allows you to reference ranges from a previously processed layer
 * by its name. The ranges are looked up from the `rangesByName` map in the context.
 *
 * @param name - The name of the layer to retrieve ranges from
 * @returns A generator function that yields ranges from the named layer
 *
 * @example
 * pipeline
 *   .addLayer(rangesForMatch(/error/g), highlight, 'errors')
 *   .addLayer(rangesFromLayer('errors'), underline)
 *
 * @example
 * pipeline.addLayer(
 *   composeRanges(
 *     rangesFromLayer('matches'),
 *     applyExpandTo('line')
 *   ),
 *   fadeOut
 * )
 */
export function rangesFromLayer<Data = unknown, RenderOptions = unknown>(
    name: string
): GenerateRanges<Data, RenderOptions> {
    return (document, createRange, context) => {
        // Get ranges from the rangesByName map
        const ranges = context?.rangesByName?.[name];

        if (!ranges) {
            // No ranges found for this name - do nothing
            return;
        }

        // Process the ranges from the layer
        processRanges(
            document,
            ranges,
            createRange,
            context
        );
    };
}

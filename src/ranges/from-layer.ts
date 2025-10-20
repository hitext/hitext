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
 * // Reference ranges from a named layer
 * pipeline
 *   .addLayer(rangeMatch(/error/g), highlight, 'errors')
 *   .addLayer(rangeFromLayer('errors'), underline)
 *
 * @example
 * // Use ranges from one layer to create derived ranges in another
 * pipeline
 *   .addLayer(rangeMatch(/\w+/g), null, 'matches')
 *   .addLayer(rangeExpandTo(rangeFromLayer('matches'), 'line'), fadeOut)
 */
export function rangeFromLayer<Data = unknown, RenderOptions = unknown>(
    name: string
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        // Get ranges from the rangesByName map
        const ranges = context?.rangesByName?.[name];

        if (!ranges) {
            // No ranges found for this name - do nothing
            return;
        }

        // Process the ranges from the layer
        processRanges(
            source,
            ranges,
            createRange,
            context
        );
    };
}

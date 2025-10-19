import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Resets origin tracking by discarding existing origins, making ranges
 * act as original ranges for subsequent transformations.
 *
 * When a range has no origin (undefined), it is considered an original range.
 * This function is useful when you need to establish a new baseline for origin
 * tracking in a transformation pipeline.
 *
 * Use case: When displaying matches in a viewport window, you may want to annotate
 * the visible (trimmed) ranges rather than the original match ranges. By resetting
 * the origin after viewport transformations, subsequent operations will treat the
 * visible ranges as the originals.
 *
 * @param input - Ranges to process
 * @returns A generator function that creates ranges without origins
 *
 * @example
 * // Display matches in a window and annotate the visible portions
 * pipeline
 *   .addLayer(rangeMatch(/error/g))
 *   .addLayer(rangeFitToWindow(...))
 *   .addLayer(rangeResetOrigin(...)) // Make trimmed ranges the new originals
 *   .addLayer(rangeCollapseTo(..., 'lineEnd')) // Annotate based on visible ranges
 *
 * @example
 * // Reset origin after merge to treat merged ranges as originals
 * rangeResetOrigin(rangeMerge(ranges, true))
 */
export function rangeResetOrigin<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        processRanges(
            source,
            input,
            (start, end, data) => {
                // Discard existing origin so the range becomes an original range
                createRange(start, end, data);
            },
            renderOptions
        );
    };
}

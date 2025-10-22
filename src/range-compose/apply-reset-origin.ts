import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Resets origin tracking by discarding existing origins (curried transformer).
 * Makes ranges act as original ranges for subsequent transformations.
 *
 * @returns A transformer function that accepts ranges and returns ranges without origins
 *
 * @example
 * // Display matches in a window and annotate the visible portions
 * composeRanges(
 *   rangesForMatch(/error/g),
 *   applyFitToWindow(80),
 *   applyResetOrigin(), // Make trimmed ranges the new originals
 *   applyCollapseTo('line-end')
 * )
 */
export function applyResetOrigin<Data, RenderOptions>():
    (input: Ranges<Data, RenderOptions>) => GenerateRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, context) => {
            processRanges(
                source,
                input,
                (start, end, data) => {
                    createRange(start, end, data);
                },
                context
            );
        };
    };
}

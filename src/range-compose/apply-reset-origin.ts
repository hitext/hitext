import type { Ranges, TransformRanges } from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Resets origin tracking by discarding existing origins (curried transformer).
 * Makes ranges act as original ranges for subsequent transformations.
 *
 * @returns A transformer function that accepts ranges and returns ranges without origins
 *
 * @example
 * // Display matches in a window and annotate the visible portions
 * rangesCompose(
 *   rangesForMatch(/error/g),
 *   applyFitToWindow(80),
 *   applyResetOrigin(), // Make trimmed ranges the new originals
 *   applyCollapseTo('line-end')
 * )
 */
export function applyResetOrigin<Data, RenderOptions>(): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRanges(
                document,
                input,
                (start, end, data) => {
                    createRange(start, end, data, undefined);
                },
                context
            );
        };
    };
}

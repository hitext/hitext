import type { SpansSource, TransformSpans } from '../types.js';
import { processSpans } from '../spans.js';

/**
 * Resets origin tracking by discarding existing origins (curried transformer).
 * Makes spans act as original spans for subsequent transformations.
 *
 * @returns A transformer function that accepts spans and returns spans without origins
 *
 * @example
 * // Display matches in a window and annotate the visible portions
 * spansCompose(
 *   spansFromMatch(/error/g),
 *   applyFitToWindow(80),
 *   applyResetOrigin(), // Make trimmed spans the new originals
 *   applyCollapseTo('line-end')
 * )
 */
export function applyResetOrigin<Data, RenderOptions>(): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            processSpans(
                document,
                input,
                (start, end, data) => {
                    createSpan(start, end, data, undefined);
                },
                context
            );
        };
    };
}

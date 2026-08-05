import type { TransformSpans } from '../types.js';
import { processSpans } from '../spans.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Collapses spans to a single position (curried transformer).
 * Useful for creating zero-width markers at specific positions.
 *
 * The original span information is preserved in the `origin` field of the collapsed span.
 *
 * @param position - Where to collapse the span to:
 *   - 'start': Beginning of the span
 *   - 'end': End of the span
 *   - 'line-start': Start of the line containing the span start
 *   - 'line-content-end': End of line content (before newline) containing the span end
 *   - 'line-end': End of line (including newline) containing the span end
 *   - 'document-start': Start of the document (offset 0)
 *   - 'document-end': End of the document (document.length)
 *
 * Note: For multiline spans, 'line-start' uses the line of span.start,
 * while 'line-end'/'line-content-end' use the line of span.end.
 *
 * @returns A transformer function that accepts spans and returns collapsed spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyCollapseTo('start')
 * )
 */
export function applyCollapseTo<Data, RenderOptions>(
    position:
        | 'start'
        | 'end'
        | 'line-start'
        | 'line-end'
        | 'line-content-end'
        | 'document-start'
        | 'document-end'
): TransformSpans<Data, RenderOptions> {
    return (input) => {
        return (document, createSpan, context) => {
            const lineBoundaries = context?.lines || createLineBoundaries(document);

            processSpans(
                document,
                input,
                (start, end, data, origin) => {
                    let targetPos: number;

                    switch (position) {
                        case 'start':
                            targetPos = start;
                            break;

                        case 'end':
                            targetPos = end;
                            break;

                        case 'line-start':
                            // Use start offset to find the line
                            targetPos = lineBoundaries.getLineStart(start);
                            break;

                        case 'line-content-end':
                            // Use end offset (or end-1 for non-empty spans) to handle multiline spans correctly
                            // Get line content end (excludes newline)
                            targetPos = lineBoundaries.getLineContentEnd(end > start ? end - 1 : end);
                            break;

                        case 'line-end':
                            // Use end offset (or end-1 for non-empty spans) to handle multiline spans correctly
                            // Get line end (includes newline)
                            targetPos = lineBoundaries.getLineEnd(end > start ? end - 1 : end);
                            break;

                        case 'document-start':
                            targetPos = 0;
                            break;

                        case 'document-end':
                            targetPos = document.length;
                            break;
                    }

                    // Use existing origin if present, otherwise create new origin from input span
                    createSpan(targetPos, targetPos, data, origin || { start, end, data });
                },
                context
            );
        };
    };
}

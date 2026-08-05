import type { SpansSource, TransformSpans } from '../types.js';
import { processSpans } from '../spans.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Expands spans to specific boundaries (curried transformer).
 * Complementary to applyCollapseTo - expands instead of collapsing.
 *
 * @param position - Where to expand the span to:
 *   - 'line': Expand to full line boundaries (including newlines)
 *   - 'line-content': Expand to line content boundaries (excluding newlines)
 *   - 'line-start': Expand start to line start, keep original end
 *   - 'line-end': Keep original start, expand end to line end (including newline)
 *   - 'line-content-end': Keep original start, expand end to line content end (excluding newline)
 *   - 'document': Expand to entire document (0 to document.length)
 *   - 'document-start': Expand start to document start (0), keep original end
 *   - 'document-end': Keep original start, expand end to document end (document.length)
 *
 * @param lines - Number of context lines to include, or tuple [before, after] (default: 0)
 *   Note: Only applies to line-based positions, ignored for document positions
 *
 * @returns A transformer function that accepts spans and returns expanded spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyExpandTo('line', 2)
 * )
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyExpandTo('line', [1, 3])
 * )
 */
export function applyExpandTo<Data, RenderOptions>(
    position:
        | 'line'
        | 'line-content'
        | 'line-start'
        | 'line-end'
        | 'line-content-end'
        | 'document'
        | 'document-start'
        | 'document-end',
    lines: number | [before: number, after: number] = 0
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            const lineBoundaries = context?.lines || createLineBoundaries(document);

            // Parse lines parameter
            const [linesBefore, linesAfter] = Array.isArray(lines)
                ? lines
                : [lines, lines];

            processSpans(document, input, (start, end, data, origin) => {
                let expandedStart: number = start;
                let expandedEnd: number = end;

                // Handle document positions
                if (position === 'document') {
                    expandedStart = 0;
                    expandedEnd = document.length;
                } else if (position === 'document-start') {
                    expandedStart = 0;
                } else if (position === 'document-end') {
                    expandedEnd = document.length;
                } else {
                    // Handle line-based positions
                    if (position === 'line' ||
                        position === 'line-start' ||
                        position === 'line-content') {
                        expandedStart = lineBoundaries.getLineStart(start, -linesBefore);
                    }

                    if (position !== 'line-start') {
                        // Use getLineContentEnd for line-content/line-content-end, getLineEnd for line/line-end
                        if (position === 'line-content' || position === 'line-content-end') {
                            expandedEnd = lineBoundaries.getLineContentEnd(
                                end > start ? end - 1 : end,
                                linesAfter
                            );
                        } else {
                            expandedEnd = lineBoundaries.getLineEnd(
                                end > start ? end - 1 : end,
                                linesAfter
                            );
                        }
                    }
                }

                // Use existing origin if present, otherwise create new origin from input span
                createSpan(expandedStart, expandedEnd, data, origin || { start, end, data });
            }, context);
        };
    };
}

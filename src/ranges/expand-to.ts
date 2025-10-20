import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Expands ranges to specific boundaries.
 * Complementary to rangeCollapseTo - expands instead of collapsing.
 *
 * @param input - Ranges to expand
 * @param position - Where to expand the range to:
 *   - 'line': Expand to full line boundaries (including newlines)
 *   - 'line-content': Expand to line content boundaries (excluding newlines)
 *   - 'line-start': Expand start to line start, keep original end
 *   - 'line-end': Keep original start, expand end to line end (including newline)
 *   - 'line-content-end': Keep original start, expand end to line content end (excluding newline)
 *   - 'document': Expand to entire document (0 to source.length)
 *   - 'document-start': Expand start to document start (0), keep original end
 *   - 'document-end': Keep original start, expand end to document end (source.length)
 *
 * @param lines - Number of context lines to include, or tuple [before, after] (default: 0)
 *   Note: Only applies to line-based positions, ignored for document positions
 *
 * @example
 * // Expand ranges to full lines (replaces rangeExpandToLines)
 * rangeExpandTo(rangeMatch(/error/g), 'line')
 *
 * @example
 * // Expand to line content with symmetric context
 * rangeExpandTo(rangeMatch(/error/g), 'line-content', 2) // 2 lines before and after
 *
 * @example
 * // Expand with asymmetric context using tuple
 * rangeExpandTo(rangeMatch(/error/g), 'line', [1, 3]) // 1 line before, 3 lines after
 *
 * @example
 * // Expand to entire document
 * rangeExpandTo(rangeMatch(/error/g), 'document')
 *
 * @example
 * // Expand to document start while keeping original end
 * rangeExpandTo(rangeMatch(/error/g), 'document-start')
 */
export function rangeExpandTo<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
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
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        const lineBoundaries = context?.lines || createLineBoundaries(source);

        // Parse lines parameter
        const [linesBefore, linesAfter] = Array.isArray(lines)
            ? lines
            : [lines, lines];

        processRanges(source, input, (start, end, data, origin) => {
            let expandedStart: number = start;
            let expandedEnd: number = end;

            // Handle document positions
            if (position === 'document') {
                expandedStart = 0;
                expandedEnd = source.length;
            } else if (position === 'document-start') {
                expandedStart = 0;
            } else if (position === 'document-end') {
                expandedEnd = source.length;
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

            // Use existing origin if present, otherwise create new origin from input range
            createRange(expandedStart, expandedEnd, data, origin || { start, end, data });
        }, context);
    };
}

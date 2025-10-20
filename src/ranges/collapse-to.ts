import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Collapses ranges to a single position.
 * Useful for creating zero-width markers at specific positions.
 *
 * The original range information is preserved in the `origin` field of the collapsed range.
 *
 * @param input - Ranges to collapse
 * @param position - Where to collapse the range to:
 *   - 'start': Beginning of the range
 *   - 'end': End of the range
 *   - 'line-start': Start of the line containing the range start
 *   - 'line-content-end': End of line content (before newline) containing the range end
 *   - 'line-end': End of line (including newline) containing the range end
 *   - 'document': Alias for 'document-start'
 *   - 'document-start': Start of the document (offset 0)
 *   - 'document-end': End of the document (source.length)
 *
 * Note: For multiline ranges, 'line-start' uses the line of range.start,
 * while 'line-end'/'line-content-end' use the line of range.end.
 *
 * @example
 * // Collapse matches to start position
 * rangeCollapseTo(rangeMatch(/error/g), 'start')
 *
 * @example
 * // Create markers at end of line content (before newline)
 * rangeCollapseTo(rangeMatch(/error/g), 'line-content-end')
 *
 * @example
 * // Create markers at end of line (after newline, start of next line)
 * rangeCollapseTo(rangeMatch(/error/g), 'line-end')
 *
 * @example
 * // Create markers at document start
 * rangeCollapseTo(rangeMatch(/error/g), 'document-start')
 */
export function rangeCollapseTo<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    position:
        | 'start'
        | 'end'
        | 'line-start'
        | 'line-end'
        | 'line-content-end'
        | 'document-start'
        | 'document-end'
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        const lineBoundaries = context?.lines || createLineBoundaries(source);

        processRanges(
            source,
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
                        // Use end offset (or end-1 for non-empty ranges) to handle multiline ranges correctly
                        // Get line content end (excludes newline)
                        targetPos = lineBoundaries.getLineContentEnd(end > start ? end - 1 : end);
                        break;

                    case 'line-end':
                        // Use end offset (or end-1 for non-empty ranges) to handle multiline ranges correctly
                        // Get line end (includes newline)
                        targetPos = lineBoundaries.getLineEnd(end > start ? end - 1 : end);
                        break;

                    case 'document-start':
                        targetPos = 0;
                        break;

                    case 'document-end':
                        targetPos = source.length;
                        break;
                }

                // Use existing origin if present, otherwise create new origin from input range
                createRange(targetPos, targetPos, data, origin || { start, end, data });
            },
            context
        );
    };
}

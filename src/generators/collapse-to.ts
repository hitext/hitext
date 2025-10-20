import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { getSharedLineBoundaries } from '../utils/line-boundaries.js';

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
 *   - 'lineStart': Start of the line containing the range start
 *   - 'lineContentEnd': End of line content (before newline) containing the range end
 *   - 'lineEnd': End of line (including newline) containing the range end
 *
 * Note: For multiline ranges, 'lineStart' uses the line of range.start,
 * while 'lineEnd'/'lineContentEnd' use the line of range.end.
 *
 * @example
 * // Collapse matches to start position
 * rangeCollapseTo(rangeMatch(/error/g), 'start')
 *
 * @example
 * // Create markers at end of line content (before newline)
 * rangeCollapseTo(rangeMatch(/error/g), 'lineContentEnd')
 *
 * @example
 * // Create markers at end of line (after newline, start of next line)
 * rangeCollapseTo(rangeMatch(/error/g), 'lineEnd')
 */
export function rangeCollapseTo<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    position: 'start' | 'end' | 'lineStart' | 'lineEnd' | 'lineContentEnd'
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const lineBoundaries = getSharedLineBoundaries(source);

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

                    case 'lineStart':
                        // Use start offset to find the line
                        targetPos = lineBoundaries.getLineStart(start);
                        break;

                    case 'lineContentEnd':
                        // Use end offset (or end-1 for non-empty ranges) to handle multiline ranges correctly
                        // Get line content end (excludes newline)
                        targetPos = lineBoundaries.getLineContentEnd(end > start ? end - 1 : end);
                        break;

                    case 'lineEnd':
                        // Use end offset (or end-1 for non-empty ranges) to handle multiline ranges correctly
                        // Get line end (includes newline)
                        targetPos = lineBoundaries.getLineEnd(end > start ? end - 1 : end);
                        break;
                }

                // Use existing origin if present, otherwise create new origin from input range
                createRange(targetPos, targetPos, data, origin || { start, end, data });
            },
            renderOptions
        );
    };
}

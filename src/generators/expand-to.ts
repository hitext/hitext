import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { getSharedLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Expands ranges to specific boundaries.
 * Complementary to rangeCollapseTo - expands instead of collapsing.
 *
 * @param input - Ranges to expand
 * @param position - Where to expand the range to:
 *   - 'line': Expand to full line boundaries (including newlines)
 *   - 'lineContent': Expand to line content boundaries (excluding newlines)
 *   - 'lineStart': Expand start to line start, keep original end
 *   - 'lineEnd': Keep original start, expand end to line end (including newline)
 *   - 'lineContentEnd': Keep original start, expand end to line content end (excluding newline)
 *
 * @param lines - Number of context lines to include, or tuple [before, after] (default: 0)
 *
 * @example
 * // Expand ranges to full lines (replaces rangeExpandToLines)
 * rangeExpandTo(rangeMatch(/error/g), 'line')
 *
 * @example
 * // Expand to line content with symmetric context
 * rangeExpandTo(rangeMatch(/error/g), 'lineContent', 2) // 2 lines before and after
 *
 * @example
 * // Expand with asymmetric context using tuple
 * rangeExpandTo(rangeMatch(/error/g), 'line', [1, 3]) // 1 line before, 3 lines after
 */
export function rangeExpandTo<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    position: 'line' | 'lineContent' | 'lineStart' | 'lineEnd' | 'lineContentEnd',
    lines: number | [before: number, after: number] = 0
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const lineBoundaries = getSharedLineBoundaries(source);

        // Parse lines parameter
        const [linesBefore, linesAfter] = Array.isArray(lines)
            ? lines
            : [lines, lines];

        processRanges(source, input, (start, end, data, origin) => {
            let expandedStart: number = start;
            let expandedEnd: number = end;

            if (position === 'line' ||
                position === 'lineStart' ||
                position === 'lineContent') {
                expandedStart = lineBoundaries.getLineStartForOffset(start, -linesBefore);
            }

            if (position !== 'lineStart') {
                expandedEnd = lineBoundaries.getLineEndForOffset(
                    end > start ? end - 1 : end,
                    !(position === 'line' || position === 'lineEnd'), // Include or exclude newline
                    linesAfter
                );
            }

            // Use existing origin if present, otherwise create new origin from input range
            createRange(expandedStart, expandedEnd, data, origin || { start, end, data });
        }, renderOptions);
    };
}

import type { GenerateRanges, Ranges, RangeRecord } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Creates padding ranges to make lines square (same width).
 *
 * For each range in the input, this function:
 * 1. Calculates how many characters are needed to reach the target size
 * 2. Creates ranges for lines before and after the original range
 * 3. Each derived range gets data indicating how many padding characters are needed
 *
 * This is useful for creating aligned/rectangular output where all lines have the same width.
 * The typical usage is to compose this with a renderer that adds padding based on the `data` value.
 *
 * @param input - Ranges to process
 * @param lines - Number of lines to add, or [linesBefore, linesAfter]
 * @param size - Target width for each line
 *
 * @example
 * // Add 1 line before and after each range, target width 80
 * const padded = rangePadLines(ranges, [1, 1], 80);
 *
 * @example
 * // Add 2 lines after each range, target width 100
 * const padded = rangePadLines(ranges, 2, 100);
 *
 * @example
 * // Use with renderer to add actual padding
 * render(source, [
 *     rangePadLines(highlights, [1, 1], 80),
 *     rangeHooksReplace((range, rangeText) => {
 *         // Add spaces to reach target width
 *         return rangeText + ' '.repeat(range.data);
 *     })
 * ]);
 */
export function rangePadLines<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    lines: number | [number, number],
    size: number
): GenerateRanges<number, RenderOptions> {
    return (source, createRange, genContext) => {
        // Collect all ranges upfront
        const ranges: Array<RangeRecord<Data>> = [];
        processRanges(source, input, (start, end, data, origin) => {
            ranges.push({ start, end, data, origin });
        }, genContext as any);

        // Early exit if no ranges
        if (ranges.length === 0) {
            return;
        }

        const lineBoundaries = createLineBoundaries(source);
        const [linesBefore, linesAfter] = typeof lines === 'number' ? [0, lines] : lines;

        for (const origRange of ranges) {
            // Create ranges for lines before, current, and after in a single loop
            for (let i = -linesBefore; i <= linesAfter; i++) {
                const lineStart = lineBoundaries.getLineStart(origRange.start, i);
                const lineEnd = lineBoundaries.getLineContentEnd(origRange.start, i);
                const rangeStart = lineStart;
                const rangeEnd = Math.min(lineStart + size, lineEnd);
                const paddingNeeded = size - (rangeEnd - rangeStart);

                createRange(rangeStart, rangeEnd, paddingNeeded, origRange as any);
            }
        }
    };
}

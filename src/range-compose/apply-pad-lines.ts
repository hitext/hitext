import type { GenerateRanges, Ranges, RangeRecord } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Creates padding ranges to make lines square (curried transformer).
 *
 * @param lines - Number of lines to add, or [linesBefore, linesAfter]
 * @param size - Target width for each line
 * @returns A transformer function that accepts ranges and returns padding ranges
 *
 * @example
 * // Add 1 line before and after each range, target width 80
 * composeRanges(ranges, applyPadLines([1, 1], 80))
 *
 * @example
 * // Add 2 lines after each range, target width 100
 * composeRanges(ranges, applyPadLines(2, 100))
 */
export function applyPadLines<Data, RenderOptions>(
    lines: number | [number, number],
    size: number
): (input: Ranges<Data, RenderOptions>) => GenerateRanges<number, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, genContext) => {
            const ranges: Array<RangeRecord<Data>> = [];
            processRanges(source, input, (start, end, data, origin) => {
                ranges.push({ start, end, data, origin });
            }, genContext as any);

            if (ranges.length === 0) {
                return;
            }

            const lineBoundaries = createLineBoundaries(source);
            const [linesBefore, linesAfter] = typeof lines === 'number' ? [0, lines] : lines;

            for (const origRange of ranges) {
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
    };
}

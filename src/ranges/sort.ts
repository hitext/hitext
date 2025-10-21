import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Sorts ranges using a comparator function.
 *
 * The comparator receives two ranges and their shared context, returning:
 * - Negative number if rangeA should come before rangeB
 * - Positive number if rangeA should come after rangeB
 * - Zero if the order doesn't matter
 *
 * If no comparator is provided, ranges are sorted by:
 * 1. Start position (ascending)
 * 2. End position (descending) - longer ranges first
 * This matches the natural rendering order in hitext.
 *
 * The comparator receives:
 * - `rangeA` - First range to compare
 * - `rangeB` - Second range to compare
 * - `context` - Operation context with source, lines, renderOptions, and all ranges
 *
 * @param input - Ranges to sort
 * @param comparator - Optional comparison function
 *
 * @example
 * // Default sort (by start ascending, then end descending)
 * const sorted = rangeSort(ranges);
 *
 * @example
 * // Sort by end position
 * rangeSort(ranges, (a, b) => a.end - b.end)
 *
 * @example
 * // Sort by data property
 * rangeSort(ranges, (a, b) => a.data.priority - b.data.priority)
 *
 * @example
 * // Sort by line number
 * rangeSort(ranges, (a, b, { lines }) =>
 *     lines.getLine(a.start) - lines.getLine(b.start)
 * )
 */
export function rangeSort<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    comparator?: (
        rangeA: RangeRecord<Data>,
        rangeB: RangeRecord<Data>,
        context: RangeOperationContext<RenderOptions>
    ) => number
): GenerateRanges<Data, RenderOptions> {
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

        // Create stable context (reused for all comparator calls)
        const context: RangeOperationContext<RenderOptions> = {
            source,
            lines: genContext?.lines || createLineBoundaries(source),
            renderOptions: genContext?.renderOptions,
            ranges
        };

        // Sort using comparator or default
        if (comparator) {
            ranges.sort((a, b) => comparator(a, b, context));
        } else {
            // Default: start ascending, end descending (render order)
            ranges.sort((a, b) =>
                a.start - b.start || b.end - a.end
            );
        }

        // Output sorted ranges
        for (const range of ranges) {
            createRange(range.start, range.end, range.data as Data, range.origin as any);
        }
    };
}

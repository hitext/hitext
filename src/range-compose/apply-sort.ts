import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Sorts ranges using a comparator function (curried transformer).
 *
 * @param comparator - Optional comparison function. If omitted, sorts by start ascending, then end descending
 * @returns A transformer function that accepts ranges and returns sorted ranges
 *
 * @example
 * // Default sort (by start ascending, then end descending)
 * composeRanges(ranges, applySort())
 *
 * @example
 * // Sort by end position
 * composeRanges(ranges, applySort((a, b) => a.end - b.end))
 */
export function applySort<Data, RenderOptions>(
    comparator?: (
        rangeA: RangeRecord<Data>,
        rangeB: RangeRecord<Data>,
        context: RangeOperationContext<RenderOptions>
    ) => number
): (input: Ranges<Data, RenderOptions>) => GenerateRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, genContext) => {
            const ranges: Array<RangeRecord<Data>> = [];
            processRanges(source, input, (start, end, data, origin) => {
                ranges.push({ start, end, data, origin });
            }, genContext as any);

            if (ranges.length === 0) {
                return;
            }

            const context: RangeOperationContext<RenderOptions> = {
                source,
                lines: genContext?.lines || createLineBoundaries(source),
                renderOptions: genContext?.renderOptions,
                ranges
            };

            const sortFn = comparator
                ? (a: RangeRecord<Data>, b: RangeRecord<Data>) => comparator(a, b, context)
                : (a: RangeRecord<Data>, b: RangeRecord<Data>) => a.start - b.start || b.end - a.end;

            ranges.sort(sortFn);

            for (const range of ranges) {
                createRange(range.start, range.end, range.data, range.origin);
            }
        };
    };
}

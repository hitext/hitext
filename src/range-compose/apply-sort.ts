import type { Ranges, RangeRecord, RangeOperationContext, TransformRanges } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Sorts ranges using a comparator function (curried transformer).
 *
 * @param comparator - Optional comparison function. If omitted, sorts by start ascending, then end descending
 * @returns A transformer function that accepts ranges and returns sorted ranges
 *
 * @example
 * composeRanges(
 *   ...,
 *   applySort()
 * )
 *
 * @example
 * composeRanges(
 *   ...,
 *   applySort((a, b) => a.end - b.end)
 * )
 */
export function applySort<Data, RenderOptions>(
    comparator?: (
        rangeA: RangeRecord<Data>,
        rangeB: RangeRecord<Data>,
        context: RangeOperationContext<RenderOptions>
    ) => number
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, genContext) => {
            const ranges: Array<RangeRecord<Data>> = [];
            processRanges(document, input, (start, end, data, origin) => {
                ranges.push({ start, end, data, origin });
            }, genContext as any);

            if (ranges.length === 0) {
                return;
            }

            const context: RangeOperationContext<RenderOptions> = {
                document,
                lines: genContext?.lines || createLineBoundaries(document),
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

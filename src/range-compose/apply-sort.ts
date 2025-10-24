import type { Ranges, RangeRecord, RangeOperationContext, TransformRanges } from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Sorts ranges using a comparator function (curried transformer).
 *
 * @param comparator - Optional comparison function. If omitted, sorts by start ascending, then end descending
 * @returns A transformer function that accepts ranges and returns sorted ranges
 *
 * @example
 * rangesCompose(
 *   ...,
 *   applySort()
 * )
 *
 * @example
 * rangesCompose(
 *   ...,
 *   applySort((a, b) => a.end - b.end)
 * )
 */
export function applySort<Data, RenderOptions>(
    comparator?: (
        rangeA: RangeRecord<Data>,
        rangeB: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => number
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRangesWithContext(document, input, context, (ranges, opContext) => {
                const sortFn = comparator
                    ? (a: RangeRecord<Data>, b: RangeRecord<Data>) => comparator(a, b, opContext)
                    : (a: RangeRecord<Data>, b: RangeRecord<Data>) => a.start - b.start || b.end - a.end;

                ranges.sort(sortFn);

                for (const range of ranges) {
                    createRange(range.start, range.end, range.data, range.origin);
                }
            });
        };
    };
}

import type { Ranges, RangeRecord, RangeOperationContext, TransformRanges } from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Filters ranges based on a predicate function (curried transformer).
 * Only ranges for which the predicate returns true will be included in the output.
 *
 * The predicate receives:
 * - `range` - The range object with start, end, data, and origin
 * - `opContext` - Operation context with document, lines, renderOptions, ranges, and index
 *
 * @param predicate - Function that tests each range
 * @returns A transformer function that accepts ranges and returns filtered ranges
 *
 * @example
 * rangesCompose(
 *   ...,
 *   applyFilter((range, { lines }) =>
 *     lines.getLine(range.start) < 10
 *   )
 * )
 */
export function applyFilter<Data, RenderOptions>(
    predicate: (
        range: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => boolean
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRangesWithContext(document, input, context, (ranges, opContext) => {
                // Filter and output ranges
                for (let i = 0; i < ranges.length; i++) {
                    const range = ranges[i];
                    opContext.index = i;

                    if (predicate(range, opContext)) {
                        createRange(range.start, range.end, range.data, range.origin);
                    }
                }
            });
        };
    };
}

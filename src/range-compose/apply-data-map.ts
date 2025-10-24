import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Maps the data of each range using a mapper function (curried transformer).
 * The range positions (start, end) are preserved, but the data is transformed.
 *
 * **Important**: Since the data changes, the origin is cleared (set to undefined).
 * This is because the transformed data represents a new semantic meaning, not a
 * transformation of the original range's position. The typical use case is fixing/enriching
 * data from rangesForMatch or other generators where you want to transform match results
 * into structured data.
 *
 * The mapper receives:
 * - `range` - The full range object with start, end, data, and origin
 * - `opContext` - Operation context with document, lines, renderOptions, ranges, and index
 *
 * @param mapper - Function that transforms the data of each range
 * @returns A transformer function that accepts ranges and returns ranges with mapped data
 *
 * @example
 * rangesCompose(
 *   ...,
 *   applyDataMap((range, { lines }) => ({
 *     match: range.data,
 *     line: lines.getLine(range.start)
 *   }))
 * )
 */
export function applyDataMap<Data, NewData, RenderOptions>(
    mapper: (
        range: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => NewData
): (input: Ranges<Data, RenderOptions>) => GenerateRanges<NewData, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRangesWithContext(document, input, context as any, (ranges, opContext) => {
                // Map and output ranges
                for (let i = 0; i < ranges.length; i++) {
                    const range = ranges[i];
                    opContext.index = i;

                    const newData = mapper(range, opContext);
                    // Origin is cleared because data transformation creates new semantic meaning
                    createRange(range.start, range.end, newData, undefined);
                }
            });
        };
    };
}

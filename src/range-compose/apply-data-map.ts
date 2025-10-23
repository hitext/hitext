import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

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
 * - `index` - Zero-based index of the range in the input sequence
 * - `context` - Operation context with source, lines, renderOptions, and all ranges
 *
 * @param mapper - Function that transforms the data of each range
 * @returns A transformer function that accepts ranges and returns ranges with mapped data
 *
 * @example
 * composeRanges(
 *   ...,
 *   applyDataMap((range, index, { lines }) => ({
 *     match: range.data,
 *     line: lines.getLine(range.start)
 *   }))
 * )
 */
export function applyDataMap<Data, NewData, RenderOptions>(
    mapper: (
        range: RangeRecord<Data>,
        index: number,
        context: RangeOperationContext<RenderOptions>
    ) => NewData
): (input: Ranges<Data, RenderOptions>) => GenerateRanges<NewData, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
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

            // Create stable context (reused for all mapper calls)
            const context: RangeOperationContext<RenderOptions> = {
                source,
                lines: genContext?.lines || createLineBoundaries(source),
                renderOptions: genContext?.renderOptions,
                ranges
            };

            // Map and output ranges
            for (let index = 0; index < ranges.length; index++) {
                const range = ranges[index];
                const newData = mapper(range, index, context);
                // Origin is cleared because data transformation creates new semantic meaning
                createRange(range.start, range.end, newData, undefined);
            }
        };
    };
}

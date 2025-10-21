import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Maps the data of each range using a mapper function.
 * The range positions (start, end) are preserved, but the data is transformed.
 *
 * **Important**: Since the data changes, the output ranges have no origin tracking
 * (origin is set to undefined). This is because the transformed data represents a new
 * semantic meaning. The typical use case is fixing/enriching data from rangeMatch or
 * other generators.
 *
 * The mapper receives:
 * - `data` - The current range's data
 * - `range` - The full range object with start, end, data, and origin
 * - `index` - Zero-based index of the range in the input sequence
 * - `context` - Operation context with source, lines, renderOptions, and all ranges
 *
 * @param input - Ranges to map
 * @param mapper - Function that transforms the data of each range
 *
 * @example
 * // Add line information to each range's data
 * rangeDataMap(ranges, (data, range, index, { lines }) => ({
 *     ...data,
 *     line: lines.getLine(range.start),
 *     column: lines.getColumn(range.start)
 * }))
 *
 * @example
 * // Transform data based on index
 * rangeDataMap(ranges, (data, range, index) => ({
 *     ...data,
 *     index,
 *     label: `Item ${index + 1}`
 * }))
 *
 * @example
 * // Use source text in transformation
 * rangeDataMap(ranges, (data, range, index, { source }) => ({
 *     ...data,
 *     text: source.slice(range.start, range.end),
 *     length: range.end - range.start
 * }))
 */
export function rangeDataMap<Data, NewData, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    mapper: (
        data: Data,
        range: RangeRecord<Data>,
        index: number,
        context: RangeOperationContext<RenderOptions>
    ) => NewData
): GenerateRanges<NewData, RenderOptions> {
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
            const newData = mapper(range.data as Data, range, index, context);
            // New data means new origin - pass undefined to make this range its own origin
            createRange(range.start, range.end, newData, undefined);
        }
    };
}

import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Filters ranges based on a predicate function.
 * Only ranges for which the predicate returns true will be included in the output.
 *
 * The predicate receives:
 * - `range` - The range object with start, end, data, and origin
 * - `index` - Zero-based index of the range in the input sequence
 * - `context` - Operation context with source, lines, renderOptions, and all ranges
 *
 * @param input - Ranges to filter
 * @param predicate - Function that tests each range
 *
 * @example
 * // Filter ranges that span multiple lines
 * rangeFilter(ranges, (range, index, { lines }) => {
 *     return lines.getLine(range.start) !== lines.getLine(range.end);
 * })
 *
 * @example
 * // Filter by data property
 * rangeFilter(diagnostics, (range) => range.data.severity === 'error')
 *
 * @example
 * // Filter using render options
 * rangeFilter(ranges, (range, index, { renderOptions }) => {
 *     const viewport = renderOptions?.viewport;
 *     return range.start >= viewport?.start && range.end <= viewport?.end;
 * })
 */
export function rangeFilter<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    predicate: (
        range: RangeRecord<Data>,
        index: number,
        context: RangeOperationContext<RenderOptions>
    ) => boolean
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, genContext) => {
        // Collect all ranges upfront
        const ranges: Array<RangeRecord<Data>> = [];
        processRanges(source, input, (start, end, data, origin) => {
            ranges.push({ start, end, data, origin });
        }, genContext);

        // Early exit if no ranges
        if (ranges.length === 0) {
            return;
        }

        // Create stable context (reused for all predicate calls)
        const context: RangeOperationContext<RenderOptions> = {
            source,
            lines: genContext?.lines || createLineBoundaries(source),
            renderOptions: genContext?.renderOptions,
            ranges
        };

        // Filter and output ranges
        for (let index = 0; index < ranges.length; index++) {
            const range = ranges[index];
            if (predicate(range, index, context)) {
                createRange(range.start, range.end, range.data, range.origin);
            }
        }
    };
}

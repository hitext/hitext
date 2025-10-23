import type { Ranges, RangeRecord, RangeOperationContext, TransformRanges } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Filters ranges based on a predicate function (curried transformer).
 * Only ranges for which the predicate returns true will be included in the output.
 *
 * The predicate receives:
 * - `range` - The range object with start, end, data, and origin
 * - `index` - Zero-based index of the range in the input sequence
 * - `context` - Operation context with document, lines, renderOptions, and all ranges
 *
 * @param predicate - Function that tests each range
 * @returns A transformer function that accepts ranges and returns filtered ranges
 *
 * @example
 * composeRanges(
 *   ...,
 *   applyFilter((range, index, { lines }) =>
 *     lines.getLine(range.start) < 10
 *   )
 * )
 */
export function applyFilter<Data, RenderOptions>(
    predicate: (
        range: RangeRecord<Data>,
        index: number,
        context: RangeOperationContext<RenderOptions>
    ) => boolean
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, genContext) => {
            // Collect all ranges upfront
            const ranges: Array<RangeRecord<Data>> = [];
            processRanges(document, input, (start, end, data, origin) => {
                ranges.push({ start, end, data, origin });
            }, genContext);

            // Early exit if no ranges
            if (ranges.length === 0) {
                return;
            }

            // Create stable context (reused for all predicate calls)
            const context: RangeOperationContext<RenderOptions> = {
                document,
                lines: genContext?.lines || createLineBoundaries(document),
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
    };
}

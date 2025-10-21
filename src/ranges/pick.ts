import type { GenerateRanges, Ranges, RangeRecord, RangeOperationContext } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Picks a single range from the input based on a selector.
 *
 * The selector can be:
 * - `'first'` - Pick the first range
 * - `'last'` - Pick the last range
 * - A predicate function that returns true for the range to pick
 *
 * When using a predicate, the first range for which the predicate returns true will be picked.
 * The predicate receives:
 * - `range` - The range object with start, end, data, and origin
 * - `index` - Zero-based index of the range in the input sequence
 * - `context` - Operation context with source, lines, renderOptions, and all ranges
 *
 * Note: This function does NOT sort the ranges. If you need to pick based on position or data,
 * compose it with rangeSort first.
 *
 * @param input - Ranges to pick from
 * @param selector - How to pick the range ('first', 'last', or predicate function)
 *
 * @example
 * // Pick first range
 * rangePick(ranges, 'first')
 *
 * @example
 * // Pick last range
 * rangePick(ranges, 'last')
 *
 * @example
 * // Pick first error diagnostic
 * rangePick(diagnostics, (range) => range.data.severity === 'error')
 *
 * @example
 * // Pick range at specific position
 * rangePick(ranges, (range) => range.start === 42)
 *
 * @example
 * // Pick longest range (compose with rangeSort)
 * pipeline(
 *     ranges,
 *     rangeSort((a, b) => (b.end - b.start) - (a.end - a.start)),
 *     rangePick('first')
 * )
 *
 * @example
 * // Pick range on specific line
 * rangePick(ranges, (range, index, { lines }) => lines.getLine(range.start) === 5)
 */
export function rangePick<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    selector: 'first' | 'last' | ((
        range: RangeRecord<Data>,
        index: number,
        context: RangeOperationContext<RenderOptions>
    ) => boolean)
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

        let picked: RangeRecord<Data> | null = null;

        if (selector === 'first') {
            picked = ranges[0];
        } else if (selector === 'last') {
            picked = ranges[ranges.length - 1];
        } else {
            // Predicate function
            const lines = createLineBoundaries(source);
            const context: RangeOperationContext<RenderOptions> = {
                source,
                lines,
                renderOptions: genContext?.renderOptions,
                ranges
            };

            for (let i = 0; i < ranges.length; i++) {
                if (selector(ranges[i], i, context)) {
                    picked = ranges[i];
                    break;
                }
            }
        }

        // Emit the picked range
        if (picked !== null) {
            createRange(picked.start, picked.end, picked.data, picked.origin);
        }
    };
}

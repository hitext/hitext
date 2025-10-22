import { processRanges } from '../ranges.js';
import type { GenerateRanges, Ranges, RangeIterable, RangesGenerator } from '../types.js';

/**
 * Normalizes various input formats into a GenerateRanges function.
 *
 * Supports:
 * - Generator functions: `function*(source, renderOptions) { yield [0, 10]; }`
 * - Functions returning iterables: `(source, renderOptions) => [[0, 10], [20, 30]]`
 * - Functions returning GenerateRanges: `() => (source, createRange, renderOptions) => { ... }`
 * - Iterables: `[[0, 10], [20, 30]]`
 *
 * @param input - The input to normalize
 *
 * @example
 * // Generator function
 * rangesFrom(function*(source) {
 *     yield [0, 10];
 *     yield [10, 20, { type: 'match' }];
 * })
 *
 * @example
 * // Function returning iterable
 * rangesFrom(() => [[0, 10], [20, 30]])
 *
 * @example
 * // Function returning GenerateRanges
 * rangesFrom(() => (source, createRange) => {
 *     createRange(0, 10);
 * })
 */
export function rangesFrom<Data = unknown, RenderOptions = unknown>(
    input: RangeIterable<Data> | RangesGenerator<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        const ranges: Ranges<Data, RenderOptions> = typeof input === 'function'
            ? input(source, context?.renderOptions)
            : input;

        processRanges(source, ranges, createRange, context);
    };
}

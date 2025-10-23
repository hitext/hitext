import { processRanges } from '../ranges.js';
import type { GenerateRanges, Ranges, RangeIterable, RangesGenerator } from '../types.js';

/**
 * Normalizes various input formats into a GenerateRanges function.
 *
 * Supports:
 * - Generator functions: `function*(document, renderOptions) { yield [0, 10]; }`
 * - Functions returning iterables: `(document, renderOptions) => [[0, 10], [20, 30]]`
 * - Functions returning GenerateRanges: `() => (document, createRange, renderOptions) => { ... }`
 * - Iterables: `[[0, 10], [20, 30]]`
 *
 * @param input - The input to normalize
 * @returns A GenerateRanges function
 *
 * @example
 * rangesFrom([[0, 10], [20, 30]])
 *
 * @example
 * rangesFrom((document) => [[0, document.length]])
 */
export function rangesFrom<Data = unknown, RenderOptions = unknown>(
    input: RangeIterable<Data> | RangesGenerator<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions> {
    return (document, createRange, context) => {
        const ranges: Ranges<Data, RenderOptions> = typeof input === 'function'
            ? input(document, context?.renderOptions)
            : input;

        processRanges(document, ranges, createRange, context);
    };
}

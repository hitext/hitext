import type {
    Ranges,
    TransformRanges
} from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Takes first or last N ranges from the input (curried transformer).
 * Useful for pagination, previews, or limiting output.
 *
 * Supports:
 * - Positive number: Take first N ranges
 * - Negative number: Take last N ranges
 * - 'first': Take first range (equivalent to 1)
 * - 'last': Take last range (equivalent to -1)
 *
 * @param n - Number of ranges to take, or 'first'/'last' keyword
 * @returns A transformer function that takes N ranges from input
 *
 * @example
 * rangesCompose(...,
 *   applyTake(10)     // Take first 10 ranges
 * )
 *
 * @example
 * rangesCompose(...,
 *   applyTake(-5)     // Take last 5 ranges
 * )
 *
 * @example
 * rangesCompose(...,
 *   applyTake('last') // Take last match, alias for applyTake(-1)
 * )
 */
export function applyTake<Data, RenderOptions>(
    n: number | 'first' | 'last'
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRangesWithContext(document, input, context, (ranges) => {
                // Convert keywords to numbers
                const count = n === 'first' ? 1 : n === 'last' ? -1 : n;

                // Determine which ranges to emit
                const selected = count >= 0 ? ranges.slice(0, count) : ranges.slice(count);

                // Emit selected ranges
                for (const range of selected) {
                    createRange(range.start, range.end, range.data, range.origin);
                }
            });
        };
    };
}

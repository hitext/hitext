import type {
    Ranges,
    RangeRecord,
    RangeOperationContext,
    TransformRanges
} from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Takes first or last N ranges from the input, with optional filtering (curried transformer).
 * Combines positional limiting with filtering - evaluates ranges in order and stops
 * when limit is reached. This is more efficient than applyFilter when you need a fixed
 * number of results, as it stops processing early.
 *
 * Supports:
 * - Positive number: Take first N ranges (that match predicate if provided)
 * - Negative number: Take last N ranges (that match predicate if provided)
 * - 'first': Take first range (equivalent to 1)
 * - 'last': Take last range (equivalent to -1)
 *
 * @param n - Number of ranges to take, or 'first'/'last' keyword
 * @param predicate - Optional filter function, same signature as applyFilter
 * @returns A transformer function that takes N ranges from input
 *
 * @example
 * rangesCompose(...,
 *   applyTake(10)  // Take first 10 ranges
 * )
 *
 * @example
 * rangesCompose(...,
 *   applyTake(-5)     // Take last 5 ranges
 * )
 *
 * @example
 * rangesCompose(...,
 *   applyTake('first', range => range.data.severity === 'error')  // First error
 * )
 */
export function applyTake<Data, RenderOptions>(
    n: number | 'first' | 'last',
    predicate?: (
        range: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => boolean
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRangesWithContext(document, input, context, (ranges, opContext) => {
                const count = n === 'first' ? 1 : n === 'last' ? -1 : n;
                let taken: RangeRecord<Data>[] = [];

                if (!predicate) {
                    // No filter: simple slice
                    taken = count >= 0 ? ranges.slice(0, count) : ranges.slice(count);
                } else {
                    // With filter: iterate in appropriate direction
                    const [startIndex, endIndex, step] = count >= 0
                        ? [0, ranges.length, 1]
                        : [ranges.length - 1, -1, -1];

                    for (let i = startIndex, left = Math.abs(count); i !== endIndex; i += step) {
                        opContext.index = i;
                        if (predicate(ranges[i], opContext)) {
                            taken.splice(step === 1 ? taken.length : 0, 0, ranges[i]);
                            if (--left === 0) {
                                break;
                            }
                        }
                    }
                }

                for (const range of taken) {
                    createRange(range.start, range.end, range.data, range.origin);
                }
            });
        };
    };
}

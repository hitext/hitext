import type {
    SpansSource,
    SpanRecord,
    SpanOperationContext,
    TransformSpans
} from '../types.js';
import { processSpansWithContext } from '../utils/span-operation-context.js';

/**
 * Takes first or last N spans from the input, with optional filtering (curried transformer).
 * Combines positional limiting with filtering - evaluates spans in order and stops
 * when limit is reached. This is more efficient than applyFilter when you need a fixed
 * number of results, as it stops processing early.
 *
 * Supports:
 * - Positive number: Take first N spans (that match predicate if provided)
 * - Negative number: Take last N spans (that match predicate if provided)
 * - 'first': Take first span (equivalent to 1)
 * - 'last': Take last span (equivalent to -1)
 *
 * @param n - Number of spans to take, or 'first'/'last' keyword
 * @param predicate - Optional filter function, same signature as applyFilter
 * @returns A transformer function that takes N spans from input
 *
 * @example
 * spansCompose(...,
 *   applyTake(10)  // Take first 10 spans
 * )
 *
 * @example
 * spansCompose(...,
 *   applyTake(-5)     // Take last 5 spans
 * )
 *
 * @example
 * spansCompose(...,
 *   applyTake('first', span => span.data.severity === 'error')  // First error
 * )
 */
export function applyTake<Data, RenderOptions>(
    n: number | 'first' | 'last',
    predicate?: (
        span: SpanRecord<Data>,
        opContext: SpanOperationContext<Data, RenderOptions>
    ) => boolean
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            processSpansWithContext(document, input, context, (spans, opContext) => {
                const count = n === 'first' ? 1 : n === 'last' ? -1 : n;
                let taken: SpanRecord<Data>[] = [];

                if (count === 0) {
                    return;
                } else if (!predicate) {
                    // No filter: simple slice
                    taken = count >= 0 ? spans.slice(0, count) : spans.slice(count);
                } else {
                    // With filter: iterate in appropriate direction
                    const [startIndex, endIndex, step] = count >= 0
                        ? [0, spans.length, 1]
                        : [spans.length - 1, -1, -1];

                    for (let i = startIndex, left = Math.abs(count); i !== endIndex; i += step) {
                        opContext.index = i;
                        if (predicate(spans[i], opContext)) {
                            taken.splice(step === 1 ? taken.length : 0, 0, spans[i]);
                            if (--left === 0) {
                                break;
                            }
                        }
                    }
                }

                for (const span of taken) {
                    createSpan(span.start, span.end, span.data, span.origin);
                }
            });
        };
    };
}

import type { SpansSource, SpanRecord, SpanOperationContext, TransformSpans } from '../types.js';
import { processSpansWithContext } from '../utils/span-operation-context.js';

/**
 * Sorts spans using a comparator function (curried transformer).
 *
 * @param comparator - Optional comparison function. If omitted, sorts by start ascending, then end descending
 * @returns A transformer function that accepts spans and returns sorted spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applySort()
 * )
 *
 * @example
 * spansCompose(
 *   ...,
 *   applySort((a, b) => a.end - b.end)
 * )
 */
export function applySort<Data, RenderOptions>(
    comparator?: (
        spanA: SpanRecord<Data>,
        spanB: SpanRecord<Data>,
        opContext: SpanOperationContext<RenderOptions>
    ) => number
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            processSpansWithContext(document, input, context, (spans, opContext) => {
                const sortFn = comparator
                    ? (a: SpanRecord<Data>, b: SpanRecord<Data>) => comparator(a, b, opContext)
                    : (a: SpanRecord<Data>, b: SpanRecord<Data>) => a.start - b.start || b.end - a.end;

                spans.sort(sortFn);

                for (const span of spans) {
                    createSpan(span.start, span.end, span.data, span.origin);
                }
            });
        };
    };
}

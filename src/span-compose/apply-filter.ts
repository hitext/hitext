import type { SpansSource, SpanRecord, SpanOperationContext, TransformSpans } from '../types.js';
import { processSpansWithContext } from '../utils/span-operation-context.js';

/**
 * Filters spans based on a predicate function (curried transformer).
 * Only spans for which the predicate returns true will be included in the output.
 *
 * The predicate receives:
 * - `span` - The span object with start, end, data, and origin
 * - `opContext` - Operation context with document, lines, renderOptions, spans, and index
 *
 * @param predicate - Function that tests each span
 * @returns A transformer function that accepts spans and returns filtered spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyFilter((span, { lines }) =>
 *     lines.getLine(span.start) < 10
 *   )
 * )
 */
export function applyFilter<Data, RenderOptions>(
    predicate: (
        span: SpanRecord<Data>,
        opContext: SpanOperationContext<RenderOptions>
    ) => boolean
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            processSpansWithContext(document, input, context, (spans, opContext) => {
                // Filter and output spans
                for (let i = 0; i < spans.length; i++) {
                    const span = spans[i];
                    opContext.index = i;

                    if (predicate(span, opContext)) {
                        createSpan(span.start, span.end, span.data, span.origin);
                    }
                }
            });
        };
    };
}

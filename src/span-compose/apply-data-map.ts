import type { GenerateSpans, SpansSource, SpanRecord, SpanOperationContext } from '../types.js';
import { processSpansWithContext } from '../utils/span-operation-context.js';

/**
 * Maps the data of each span using a mapper function (curried transformer).
 * The span positions (start, end) are preserved, but the data is transformed.
 *
 * **Important**: Since the data changes, the origin is cleared (set to undefined).
 * This is because the transformed data represents a new semantic meaning, not a
 * transformation of the original span's position. The typical use case is fixing/enriching
 * data from spansFromMatch or other generators where you want to transform match results
 * into structured data.
 *
 * The mapper receives:
 * - `span` - The full span object with start, end, data, and origin
 * - `opContext` - Operation context with document, lines, renderOptions, spans, and index
 *
 * @param mapper - Function that transforms the data of each span
 * @returns A transformer function that accepts spans and returns spans with mapped data
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyDataMap((span, { lines }) => ({
 *     match: span.data,
 *     line: lines.getLine(span.start)
 *   }))
 * )
 */
export function applyDataMap<Data, NewData, RenderOptions>(
    mapper: (
        span: SpanRecord<Data>,
        opContext: SpanOperationContext<RenderOptions>
    ) => NewData
): (input: SpansSource<Data, RenderOptions>) => GenerateSpans<NewData, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            processSpansWithContext(document, input, context as any, (spans, opContext) => {
                // Map and output spans
                for (let i = 0; i < spans.length; i++) {
                    const span = spans[i];
                    opContext.index = i;

                    const newData = mapper(span, opContext);
                    // Origin is cleared because data transformation creates new semantic meaning
                    createSpan(span.start, span.end, newData, undefined);
                }
            });
        };
    };
}

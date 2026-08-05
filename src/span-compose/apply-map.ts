import type {
    SpansSource,
    SpanRecord,
    SpanOperationContext,
    TransformSpans,
    CreateSpan,
    GenerateSpansContext
} from '../types.js';
import { processSpansWithContext } from '../utils/span-operation-context.js';

/**
 * Maps each span to zero or more new spans (curried transformer).
 * This is the core 1-to-N primitive for span transformation.
 *
 * The mapper receives:
 * - \`span\` - The source span object with start, end, data, and origin
 * - \`createSpan\` - Callback to emit new spans
 * - \`opContext\` - Operation context with document, lines, renderOptions, spans, and index
 *
 * **Origin Tracking**: Automatically preserves span lineage. New spans inherit
 * \`span.origin || span\` as their origin, maintaining the root reference through
 * transformation chains.
 *
 * **Key Difference from applyDataMap**: While applyDataMap preserves positions and
 * transforms data (1-to-1), applyMap allows creating any number of spans with
 * different positions (1-to-N).
 *
 * @param mapper - Function that maps each span to zero or more new spans
 * @returns A transformer function that accepts spans and returns mapped spans
 *
 * @example
 * // Split each span into prefix and label spans
 * spansCompose(
 *   spansFromMatch(/(?:(\w+) )?(ERROR|WARNING|INFO)/g),
 *   applyMap((span, createSpan, { document }) => {
 *     const prefix = span.data[1]; // optional prefix
 *     let labelStart = span.start;
 *     if (prefix !== undefined) {
 *       createSpan(span.start, span.start + prefix.length, 'prefix');  // opening prefix
 *       labelStart += prefix.length + 1; // +1 for space
 *     }
 *     createSpan(labelStart, span.end, span.data[2]); // label
 *   })
 * )
 */
export function applyMap<InputData, OutputData, RenderOptions>(
    mapper: (
        span: SpanRecord<InputData>,
        createSpan: (start: number, end: number, data?: OutputData) => void,
        opContext: SpanOperationContext<RenderOptions>
    ) => void
): TransformSpans<OutputData, RenderOptions> {
    return ((input: SpansSource<InputData, RenderOptions>) => {
        return (
            document: string,
            createSpan: CreateSpan<OutputData>,
            context: GenerateSpansContext<OutputData, RenderOptions> | undefined
        ) => {
            processSpansWithContext(document, input, context as any, (spans, opContext) => {
                for (let i = 0; i < spans.length; i++) {
                    const span = spans[i];
                    opContext.index = i;

                    // Automatic origin tracking: preserve root reference
                    const origin = span.origin || { start: span.start, end: span.end, data: span.data };

                    // Create wrapper that automatically adds origin
                    const createSpanWithOrigin = (
                        start: number,
                        end: number,
                        data?: OutputData
                    ) => {
                        createSpan(start, end, data, origin as any);
                    };

                    mapper(span, createSpanWithOrigin, opContext);
                }
            });
        };
    }) as any;
}

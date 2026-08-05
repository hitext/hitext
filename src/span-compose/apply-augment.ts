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
 * Augments spans by passing them through unchanged and emitting additional spans (curried transformer).
 * Original spans preserve their data and origin. Additional spans become derivatives.
 *
 * The augmenter receives:
 * - `span` - The source span object with start, end, data, and origin
 * - `createSpan` - Callback to emit additional spans (derivatives with automatic origin tracking)
 * - `opContext` - Operation context with document, lines, renderOptions, spans, and index
 *
 * **Use Case**: When you want to keep the original spans and add related spans around them
 * (e.g., add decorations, markers, or context without modifying the originals).
 *
 * **Origin Tracking**: Original spans pass through unchanged. Additional spans inherit
 * `span.origin || span` as their origin.
 *
 * @param augmenter - Function that emits additional spans (originals passed through automatically)
 * @returns A transformer function that accepts spans and returns augmented spans
 *
 * @example
 * spansCompose(...,
 *   applyAugment((span, createSpan, { lines }) => {
 *     const lineStart = lines.getLineStart(span.start);
 *     createSpan(lineStart, lineStart, { type: 'line-marker' });
 *   })
 * )
 */
export function applyAugment<Data, RenderOptions>(
    augmenter: (
        span: SpanRecord<Data>,
        createSpan: (start: number, end: number, data?: Data) => void,
        opContext: SpanOperationContext<Data, RenderOptions>
    ) => void
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (
            document: string,
            createSpan: CreateSpan<Data>,
            context: GenerateSpansContext<Data, RenderOptions> | undefined
        ) => {
            processSpansWithContext(document, input, context, (spans, opContext) => {
                for (let i = 0; i < spans.length; i++) {
                    const span = spans[i];
                    opContext.index = i;

                    // Pass through original span unchanged
                    createSpan(span.start, span.end, span.data, span.origin);

                    // Automatic origin tracking for additional spans
                    const origin = span.origin || { start: span.start, end: span.end, data: span.data };

                    // Create wrapper that automatically adds origin to additional spans
                    const createSpanWithOrigin = (
                        start: number,
                        end: number,
                        data?: Data
                    ) => {
                        createSpan(start, end, data, origin as any);
                    };

                    // Emit any additional spans from user
                    augmenter(span, createSpanWithOrigin, opContext);
                }
            });
        };
    };
}

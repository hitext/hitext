import type { SpanRecord, SpanOperationContext, GenerateSpansContext, SpansSource } from '../types.js';
import { processSpans } from '../spans.js';
import { createLineBoundaries } from './line-boundaries.js';

/**
 * Creates a SpanOperationContext for use in span transformation callbacks.
 *
 * This helper standardizes context creation across transformers that need to provide
 * stable context to user callbacks (filter, map, sort, pick, etc.).
 *
 * @param document - The document text
 * @param spans - Array of collected spans
 * @param genContext - Optional generation context for reusing lines/renderOptions
 * @returns A SpanOperationContext with index initialized to 0
 */
export function createSpanOperationContext<Data, RenderOptions>(
    document: string,
    spans: Array<SpanRecord<Data>>,
    genContext?: GenerateSpansContext<Data, RenderOptions>
): SpanOperationContext<RenderOptions> & { index: number } {
    return {
        document,
        lines: genContext?.lines || createLineBoundaries(document),
        renderOptions: genContext?.renderOptions,
        spans,
        index: 0
    };
}

/**
 * Collects spans and executes a callback with spans and operation context.
 * Handles empty spans case automatically (callback not invoked if no spans).
 * This helper is preferred for transformers as it provides cleaner control flow.
 *
 * @param document - The document text
 * @param input - Span input to collect
 * @param context - Generation context
 * @param callback - Function to execute with collected spans and operation context
 */
export function processSpansWithContext<Data, RenderOptions>(
    document: string,
    input: SpansSource<Data, RenderOptions>,
    context: GenerateSpansContext<Data, RenderOptions> | undefined,
    callback: (
        spans: Array<SpanRecord<Data>>,
        opContext: SpanOperationContext<RenderOptions>
    ) => void
): void {
    const spans: Array<SpanRecord<Data>> = [];
    processSpans(document, input, (start, end, data, origin) => {
        spans.push({ start, end, data, origin });
    }, context);

    // Early exit if no spans
    if (spans.length === 0) {
        return;
    }

    const opContext = createSpanOperationContext(document, spans, context);
    callback(spans, opContext);
}

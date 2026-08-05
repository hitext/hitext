import type { SpanRecord, SpansSource, TransformSpans } from '../types.js';
import { processSpans } from '../spans.js';

/**
 * Fork the pipeline: pass through original spans, then append transformed copies (curried transformer).
 *
 * This is a high-level composition helper that:
 * 1. Emits all input spans unchanged
 * 2. Applies a sub-pipeline to the same spans
 * 3. Appends the transformed results
 *
 * **Use Case**: When you want both the original spans AND some derivative transformation
 * (e.g., show matches + add line markers, show diagnostics + add gutter icons).
 *
 * @param transformers - Sub-pipeline transformers to apply to input spans
 * @returns A transformer that emits originals + transformed copies
 *
 * @example
 * // Show matches + line-start indicators
 * spansCompose(
 *   ...,
 *   applyFork(
 *     applyCollapseTo('line-start'),
 *     applyDataMap(() => ({ type: 'line-marker' }))
 *   )
 * )
 */
export function applyFork<Data, RenderOptions>(): TransformSpans<Data, RenderOptions>;
export function applyFork<Data, RenderOptions, OutputData = Data>(
    transform1: TransformSpans<Data, RenderOptions, OutputData>
): TransformSpans<Data, RenderOptions, Data | OutputData>;
export function applyFork<Data, RenderOptions, Data1 = Data, OutputData = Data1>(
    transform1: TransformSpans<Data, RenderOptions, Data1>,
    transform2: TransformSpans<Data1, RenderOptions, OutputData>
): TransformSpans<Data, RenderOptions, Data | OutputData>;
export function applyFork<Data, RenderOptions, Data1 = Data, Data2 = Data1, OutputData = Data2>(
    transform1: TransformSpans<Data, RenderOptions, Data1>,
    transform2: TransformSpans<Data1, RenderOptions, Data2>,
    transform3: TransformSpans<Data2, RenderOptions, OutputData>
): TransformSpans<Data, RenderOptions, Data | OutputData>;
export function applyFork<Data, RenderOptions>(
    ...transformers: Array<TransformSpans<any, RenderOptions, any>>
): TransformSpans<Data, RenderOptions, any>;
export function applyFork(
    ...transformers: Array<TransformSpans<any, any, any>>
): TransformSpans<any, any, any> {
    return (input: SpansSource<any, any>) => {
        return (document, createSpan, context) => {
            const spans: SpanRecord<any>[] = [];
            processSpans(document, input, (start, end, data, origin) => {
                spans.push({ start, end, data, origin });
                createSpan(start, end, data, origin);
            }, context);

            // Apply sub-pipeline to the same input
            let pipeline: SpansSource<any, any> = spans;
            for (const transformer of transformers) {
                pipeline = transformer(pipeline);
            }

            // Append transformed results
            processSpans(document, pipeline, createSpan, context);
        };
    };
}

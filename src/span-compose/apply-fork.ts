import type { SpansSource, TransformSpans } from '../types.js';
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
export function applyFork<Data, RenderOptions>(
    ...transformers: Array<TransformSpans<Data, RenderOptions>>
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            // Pass through all input spans unchanged
            processSpans(document, input, createSpan, context);

            // Apply sub-pipeline to the same input
            let pipeline: SpansSource<Data, RenderOptions> = input;
            for (const transformer of transformers) {
                pipeline = transformer(pipeline);
            }

            // Append transformed results
            processSpans(document, pipeline, createSpan, context);
        };
    };
}

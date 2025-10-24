import type { Ranges, TransformRanges } from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Fork the pipeline: pass through original ranges, then append transformed copies (curried transformer).
 *
 * This is a high-level composition helper that:
 * 1. Emits all input ranges unchanged
 * 2. Applies a sub-pipeline to the same ranges
 * 3. Appends the transformed results
 *
 * **Use Case**: When you want both the original ranges AND some derivative transformation
 * (e.g., show matches + add line markers, show diagnostics + add gutter icons).
 *
 * @param transformers - Sub-pipeline transformers to apply to input ranges
 * @returns A transformer that emits originals + transformed copies
 *
 * @example
 * // Show matches + line-start indicators
 * rangesCompose(
 *   ...,
 *   applyFork(
 *     applyCollapseTo('line-start'),
 *     applyDataMap(() => ({ type: 'line-marker' }))
 *   )
 * )
 */
export function applyFork<Data, RenderOptions>(
    ...transformers: Array<TransformRanges<Data, RenderOptions>>
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            // Pass through all input ranges unchanged
            processRanges(document, input, createRange, context);

            // Apply sub-pipeline to the same input
            let pipeline: Ranges<Data, RenderOptions> = input;
            for (const transformer of transformers) {
                pipeline = transformer(pipeline);
            }

            // Append transformed results
            processRanges(document, pipeline, createRange, context);
        };
    };
}

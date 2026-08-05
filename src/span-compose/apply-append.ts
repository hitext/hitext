import type {
    SpansSource,
    TransformSpans,
    CreateSpan,
    GenerateSpansContext
} from '../types.js';
import { processSpans } from '../spans.js';

/**
 * Appends additional span sources to the pipeline result (curried transformer).
 * All input spans pass through unchanged, then additional spans are emitted.
 *
 * **Use Case**: Add independent spans that don't derive from input spans
 * (e.g., add document-level decorations, headers, footers, or metadata spans).
 *
 * **Key Difference from spansConcat**: Works mid-pipeline, allowing further
 * transformations on the combined result. spansConcat combines sources before
 * any transformations.
 *
 * @param sources - Additional span sources to append
 * @returns A transformer function that passes through input and appends additional spans
 *
 * @example
 * // Add document boundary markers
 * spansCompose(
 *   ...,
 *   applyAppend(
 *     spansFrom('document-start'),
 *     spansFrom('document-end')
 *   )
 * )
 */
export function applyAppend<Data, RenderOptions>(
    ...sources: Array<SpansSource<Data, RenderOptions>>
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (
            document: string,
            createSpan: CreateSpan<Data>,
            context: GenerateSpansContext<Data, RenderOptions> | undefined
        ) => {
            // Pass through all input spans unchanged
            processSpans(document, input, createSpan, context);

            // Then append spans from additional sources
            for (const source of sources) {
                processSpans(document, source, createSpan, context);
            }
        };
    };
}

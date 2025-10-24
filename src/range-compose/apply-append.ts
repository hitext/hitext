import type {
    Ranges,
    TransformRanges,
    CreateRange,
    GenerateRangesContext
} from '../types.js';
import { processRanges } from '../ranges.js';

/**
 * Appends additional range sources to the pipeline result (curried transformer).
 * All input ranges pass through unchanged, then additional ranges are emitted.
 *
 * **Use Case**: Add independent ranges that don't derive from input ranges
 * (e.g., add document-level decorations, headers, footers, or metadata ranges).
 *
 * **Key Difference from rangesConcat**: Works mid-pipeline, allowing further
 * transformations on the combined result. rangesConcat combines sources before
 * any transformations.
 *
 * @param sources - Additional range sources to append
 * @returns A transformer function that passes through input and appends additional ranges
 *
 * @example
 * // Add document boundary markers
 * rangesCompose(
 *   ...,
 *   applyAppend(
 *     rangesFrom('document-start'),
 *     rangesFrom('document-end')
 *   )
 * )
 */
export function applyAppend<Data, RenderOptions>(
    ...sources: Array<Ranges<Data, RenderOptions>>
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (
            document: string,
            createRange: CreateRange<Data>,
            context: GenerateRangesContext<Data, RenderOptions> | undefined
        ) => {
            // Pass through all input ranges unchanged
            processRanges(document, input, createRange, context);

            // Then append ranges from additional sources
            for (const source of sources) {
                processRanges(document, source, createRange, context);
            }
        };
    };
}

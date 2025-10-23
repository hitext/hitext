import { processRanges } from '../ranges.js';
import type { Ranges, GenerateRanges, CreateRange, GenerateRangesContext } from '../types.js';

/**
 * Creates a range generator that retrieves ranges from render options.
 *
 * This function can be used in two forms:
 * 1. With a callback function that receives render options and returns ranges
 * 2. With a field name (shortcut for accessing a property of render options)
 *
 * @param rangeInput - Either a callback function or a field name
 * @returns A range generator function
 *
 * @example
 * pipeline.addLayer(
 *   rangesFromOptions(({ pattern }) =>
 *     pattern && rangesForMatch(pattern)
 *   )
 * )
 *
 * @example
 * pipeline.addLayer(rangesFromOptions('ranges'))
 */
export function rangesFromOptions<Data = unknown, RenderOptions = unknown>(
    rangeInput: ((renderOptions: RenderOptions) => Ranges<Data, RenderOptions> | null | undefined) | keyof RenderOptions
): GenerateRanges<Data, RenderOptions> {
    const getRanges = typeof rangeInput === 'function'
        ? rangeInput
        : (renderOptions: RenderOptions) => renderOptions[rangeInput] as Ranges<Data, RenderOptions> | null | undefined;

    return function generateRangesFromOptions(
        document: string,
        createRange: CreateRange<Data>,
        context?: GenerateRangesContext<Data, RenderOptions>
    ) {
        const ranges = getRanges(context?.renderOptions || {} as RenderOptions);

        if (ranges) {
            processRanges(document, ranges, createRange, context);
        }
    };
}

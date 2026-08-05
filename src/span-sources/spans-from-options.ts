import { processSpans } from '../spans.js';
import type { SpansSource, GenerateSpans, CreateSpan, GenerateSpansContext } from '../types.js';

/**
 * Creates a span generator that retrieves spans from render options.
 *
 * This function can be used in two forms:
 * 1. With a callback function that receives render options and returns spans
 * 2. With a field name (shortcut for accessing a property of render options)
 *
 * @param spanInput - Either a callback function or a field name
 * @returns A span generator function
 *
 * @example
 * pipeline.addLayer(
 *   spansFromOptions(({ pattern }) =>
 *     pattern && spansFromMatch(pattern)
 *   )
 * )
 *
 * @example
 * pipeline.addLayer(spansFromOptions('spans'))
 */
export function spansFromOptions<Data = unknown, RenderOptions = unknown>(
    spanInput: ((renderOptions: RenderOptions) => SpansSource<Data, RenderOptions> | null | undefined) | keyof RenderOptions
): GenerateSpans<Data, RenderOptions> {
    const getSpans = typeof spanInput === 'function'
        ? spanInput
        : (renderOptions: RenderOptions) => renderOptions[spanInput] as SpansSource<Data, RenderOptions> | null | undefined;

    return function generateSpansFromOptions(
        document: string,
        createSpan: CreateSpan<Data>,
        context?: GenerateSpansContext<Data, RenderOptions>
    ) {
        const spans = getSpans(context?.renderOptions || {} as RenderOptions);

        if (spans) {
            processSpans(document, spans, createSpan, context);
        }
    };
}

import { processRanges } from '../ranges.js';
import type { Ranges, GenerateRanges, CreateRange, GenerateRangesContext } from '../types.js';

/**
 * Creates a range generator that retrieves ranges from render options.
 *
 * This function can be used in two forms:
 * 1. With a callback function that receives render options and returns ranges
 * 2. With a field name (shortcut for accessing a property of render options)
 *
 * @param source - Either a callback function or a field name
 * @returns A range generator function
 *
 * @example
 * // Using a callback to conditionally generate ranges
 * html<{ pattern?: RegExp | string }>()
 *     .addLayer(rangeFromOptions(({ pattern }) => pattern && rangeMatch(pattern)))
 *     .render('Hello world', { pattern: /Hello/ })
 *
 * @example
 * // Using a field name shortcut
 * html<{ ranges?: Ranges }>()
 *     .addLayer(rangeFromOptions('ranges'))
 *     .render('Hello world', { ranges: [[1, 5]] })
 *
 * @example
 * // The callback can return null/undefined when no ranges should be generated
 * html<{ highlight?: boolean }>()
 *     .addLayer(rangeFromOptions(({ highlight }) =>
 *         highlight ? rangeMatch(/\w+/g) : null
 *     ))
 *     .render('Hello world', { highlight: true })
 */
export function rangeFromOptions<Data = unknown, RenderOptions = unknown>(
    source: ((renderOptions: RenderOptions) => Ranges<Data, RenderOptions> | null | undefined) | keyof RenderOptions
): GenerateRanges<Data, RenderOptions> {
    const getRanges = typeof source === 'function'
        ? source
        : (renderOptions: RenderOptions) => renderOptions[source] as Ranges<Data, RenderOptions> | null | undefined;

    return function generateRangesFromOptions(
        sourceText: string,
        createRange: CreateRange<Data>,
        context?: GenerateRangesContext<Data, RenderOptions>
    ) {
        if (!context?.renderOptions) {
            return;
        }

        const ranges = getRanges(context.renderOptions);

        if (ranges) {
            processRanges(sourceText, ranges, createRange, context);
        }
    };
}

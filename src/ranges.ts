import type {
    GeneratedRange,
    PipelineLayer,
    RangeMarker,
    Ranges
} from './types.js';

export function generateRangesFromLayers<RenderOptions, Data, T, R, HC>(
    source: string,
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[],
    renderOptions?: RenderOptions
): GeneratedRange<Data>[] {
    return layers.reduce(
        (buffer, { marker, ranges }) =>
            generateRanges(source, ranges, marker, renderOptions, buffer),
        [] as GeneratedRange<Data>[]
    );
}

/**
 * Generate ranges with a marker type from various input formats.
 *
 * @param source - The source string
 * @param input - Range input (generator function, tuples, or objects)
 * @param marker - The marker to tag ranges with (defaults to unique Symbol)
 * @param renderOptions - Optional rendering options passed to generator functions
 * @param ranges - Optional array to append ranges to (defaults to new array)
 * @returns Returns `ranges` if provided; otherwise, a new array is created
 */
export function generateRanges<Data, RenderOptions>(
    source: string,
    input: Ranges<Data, RenderOptions>,
    marker: RangeMarker = Symbol(),
    renderOptions?: RenderOptions,
    ranges: GeneratedRange<Data>[] = []
) {
    processRanges(
        source,
        input,
        (start, end, data) => ranges.push({ type: marker, start, end, data }),
        renderOptions
    );

    return ranges;
}

/**
 * Process ranges from various input formats by calling a createRange callback.
 * This is a low-level function that doesn't create GeneratedRange objects.
 *
 * @param source - The source string
 * @param input - Range input (function or iterable of tuples/objects)
 * @param createRange - Callback to create each range
 * @param renderOptions - Optional rendering options passed to generator functions
 */
export function processRanges<Data, RenderOptions>(
    source: string,
    input: Ranges<Data, RenderOptions>,
    createRange: (start: number, end: number, data?: Data) => void,
    renderOptions?: RenderOptions
): void {
    if (typeof input === 'function') {
        // GenerateRanges function
        input(source, createRange, renderOptions);
    } else {
        // Iterable (arrays, Sets, Maps, custom iterables, etc.)
        for (const range of input) {
            if (Array.isArray(range)) {
                // Tuple form, i.e. [start, end, data?]
                createRange(range[0], range[1], range[2]);
            } else {
                // Object form, i.e. { start, end, data? }
                createRange(range.start, range.end, range.data);
            }
        }
    }
}

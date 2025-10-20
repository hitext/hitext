import type {
    CreateRange,
    GeneratedRange,
    GenerateRangesContext,
    LineBoundaries,
    PipelineLayer,
    RangeMarker,
    Ranges
} from './types.js';
import { createLineBoundaries } from './utils/line-boundaries.js';

/**
 * Generate ranges from multiple pipeline layers.
 * Each layer's ranges are generated and tagged with the layer's marker.
 *
 * @param source - The source string to generate ranges from
 * @param layers - Array of pipeline layers, each containing a marker and ranges input
 * @param renderOptions - Optional rendering options passed to generator functions
 * @param lines - LineBoundaries instance for the source (created if not provided)
 * @returns Array of generated ranges from all layers
 */
export function generateRangesFromLayers<RenderOptions, Data, T, R, HC>(
    source: string,
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[],
    renderOptions?: RenderOptions,
    lines: LineBoundaries = createLineBoundaries(source)
): GeneratedRange<Data>[] {
    let result: GeneratedRange<Data>[] = [];
    const rangesByMarker: Record<RangeMarker, GeneratedRange<Data>[]> = Object.create(null);
    const rangesByName: Record<string, GeneratedRange<Data>[]> = Object.create(null);

    for (const layer of layers) {
        const { name, marker, ranges } = layer;
        const buffer = generateRanges(source, ranges, {
            renderOptions,
            rangesByMarker,
            rangesByName,
            marker,
            lines
        });

        rangesByMarker[marker] = buffer;
        result = result.concat(buffer);

        if (name) {
            rangesByName[name] = buffer;
        }
    }

    return result;
}

/**
 * Generate ranges with a marker type from various input formats.
 * Creates GeneratedRange objects with the specified marker.
 *
 * @param source - The source string to generate ranges from
 * @param input - Range input: generator function, iterable of tuples [start, end, data?, origin?], or iterable of objects {start, end, data?, origin?}
 * @param context - Optional context object containing:
 *   - marker: The marker to tag ranges with (defaults to unique Symbol)
 *   - renderOptions: Rendering options passed to generator functions
 *   - ranges: Existing array to reference (not used for output)
 *   - lines: LineBoundaries instance for line calculations
 * @returns Array of generated ranges with the marker type
 *
 * @example
 * // Using a generator function
 * const ranges = generateRanges(source, rangeMatch(/error/g));
 *
 * @example
 * // Using tuples with data and origin
 * const ranges = generateRanges(source, [[0, 5, 'data', originRange]]);
 *
 * @example
 * // With context
 * const ranges = generateRanges(source, rangeMatch(/error/g), {
 *   marker: Symbol('errors'),
 *   renderOptions: { theme: 'dark' }
 * });
 */
export function generateRanges<Data, RenderOptions>(
    source: string,
    input: Ranges<Data, RenderOptions>,
    context?: GenerateRangesContext<Data, RenderOptions>
): GeneratedRange<Data>[] {
    const marker = context?.marker || Symbol();
    const ranges: GeneratedRange<Data>[] = [];

    processRanges(
        source,
        input,
        (start, end, data, origin) =>
            ranges.push({ type: marker, start, end, data, origin }),
        context
    );

    return ranges;
}

/**
 * Process ranges from various input formats by calling a createRange callback.
 * This is a low-level function that doesn't create GeneratedRange objects - it delegates
 * range creation to the provided callback function.
 *
 * @param source - The source string to process ranges from
 * @param input - Range input: generator function, iterable of tuples [start, end, data?, origin?], or iterable of objects {start, end, data?, origin?}
 * @param createRange - Callback function called for each range: (start, end, data?, origin?) => void
 * @param context - Optional context object containing:
 *   - marker: Marker identifier for ranges
 *   - renderOptions: Rendering options passed to generator functions
 *   - ranges: Existing array to reference
 *   - lines: LineBoundaries instance for line calculations
 *
 * @example
 * // Collect ranges in a custom format
 * const customRanges = [];
 * processRanges(source, rangeMatch(/error/g), (start, end, data) => {
 *   customRanges.push({ start, end, data });
 * });
 *
 * @example
 * // Process tuples with origin tracking
 * processRanges(source, [[0, 5, 'data', parentRange]], (start, end, data, origin) => {
 *   console.log(`Range ${start}-${end}, origin:`, origin);
 * });
 */
export function processRanges<Data, RenderOptions>(
    source: string,
    input: Ranges<Data, RenderOptions>,
    createRange: CreateRange<Data>,
    context?: GenerateRangesContext<Data, RenderOptions>
): void {
    if (typeof input === 'function') {
        // GenerateRanges function
        input(source, createRange, context);
    } else {
        // Iterable (arrays, Sets, Maps, custom iterables, etc.)
        for (const range of input) {
            if (Array.isArray(range)) {
                // Tuple form, i.e. [start, end, data?]
                createRange(range[0], range[1], range[2], range[3]);
            } else {
                // Object form, i.e. { start, end, data? }
                createRange(range.start, range.end, range.data, range.origin);
            }
        }
    }
}

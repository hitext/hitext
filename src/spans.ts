import { createNoProtoObject, createLineBoundaries, isIterable } from './utils/index.js';
import type {
    CreateSpan,
    GeneratedSpan,
    GenerateSpansContext,
    LineBoundaries,
    PipelineLayer,
    SpanMarker,
    SpansSource
} from './types.js';

/**
 * Generate spans from multiple pipeline layers.
 * Each layer's spans are generated and tagged with the layer's marker.
 *
 * @param document - The document string to generate spans from
 * @param layers - Array of pipeline layers, each containing a marker and spans input
 * @param renderOptions - Optional rendering options passed to generator functions
 * @param lines - LineBoundaries instance for the document (created if not provided)
 * @returns Array of generated spans from all layers
 */
export function generateSpansFromLayers<RenderOptions, Data, T, R, HC>(
    document: string,
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[],
    renderOptions?: RenderOptions,
    lines: LineBoundaries = createLineBoundaries(document)
): GeneratedSpan<Data>[] {
    let result: GeneratedSpan<Data>[] = [];
    const spansByMarker: Record<SpanMarker, GeneratedSpan<Data>[]> = createNoProtoObject();
    const spansByName: Record<string, GeneratedSpan<Data>[]> = createNoProtoObject();

    for (const layer of layers) {
        const { name, marker, spans } = layer;
        const buffer = generateSpans(document, spans, {
            renderOptions,
            spansByMarker,
            spansByName,
            marker,
            lines
        });

        spansByMarker[marker] = buffer;
        result = result.concat(buffer);

        if (name) {
            spansByName[name] = buffer;
        }
    }

    return result;
}

/**
 * Generate spans with a marker type from various input formats.
 * Creates GeneratedSpan objects with the specified marker.
 *
 * @param document - The document string to generate spans from
 * @param input - Span input: generator function, iterable of tuples [start, end, data?, origin?], or iterable of objects {start, end, data?, origin?}
 * @param context - Optional context object containing:
 *   - marker: The marker to tag spans with (defaults to unique Symbol)
 *   - renderOptions: Rendering options passed to generator functions
 *   - spans: Optional caller-provided spans to reference (not used for output)
 *   - spansByMarker: Previously generated layer spans keyed by marker
 *   - spansByName: Previously generated named layer spans
 *   - lines: LineBoundaries instance for line calculations
 * @returns Array of generated spans with the marker type
 *
 * @example
 * // Using a generator function
 * const spans = generateSpans(document, spansFromMatch(/error/g));
 *
 * @example
 * // Using tuples with data and origin
 * const spans = generateSpans(document, [[0, 5, 'data', originSpan]]);
 *
 * @example
 * // With context
 * const spans = generateSpans(document, spansFromMatch(/error/g), {
 *   marker: Symbol('errors'),
 *   renderOptions: { theme: 'dark' }
 * });
 */
export function generateSpans<Data, RenderOptions>(
    document: string,
    input: SpansSource<Data, RenderOptions>,
    context?: GenerateSpansContext<Data, RenderOptions>
): GeneratedSpan<Data>[] {
    const marker = context?.marker ?? Symbol();
    const spans: GeneratedSpan<Data>[] = [];

    processSpans(
        document,
        input,
        (start, end, data, origin) =>
            spans.push({ type: marker, start, end, data, origin }),
        context
    );

    return spans;
}

/**
 * Process spans from various input formats by calling a createSpan callback.
 * This is a low-level function that doesn't create GeneratedSpan objects - it delegates
 * span creation to the provided callback function.
 *
 * @param document - The document string to process spans from
 * @param input - Span input: generator function, iterable of tuples [start, end, data?, origin?], or iterable of objects {start, end, data?, origin?}
 * @param createSpan - Callback function called for each span: (start, end, data?, origin?) => void
 * @param context - Optional context object containing:
 *   - marker: Marker identifier for spans
 *   - renderOptions: Rendering options passed to generator functions
 *   - spans: Optional caller-provided spans to reference
 *   - spansByMarker: Previously generated layer spans keyed by marker
 *   - spansByName: Previously generated named layer spans
 *   - lines: LineBoundaries instance for line calculations
 *
 * @example
 * // Collect spans in a custom format
 * const customSpans = [];
 * processSpans(document, spansFromMatch(/error/g), (start, end, data) => {
 *   customSpans.push({ start, end, data });
 * });
 *
 * @example
 * // Process tuples with origin tracking
 * processSpans(document, [[0, 5, 'data', originSpan]], (start, end, data, origin) => {
 *   console.log(`Span ${start}-${end}, origin:`, origin);
 * });
 */
export function processSpans<Data, RenderOptions>(
    document: string,
    input: SpansSource<Data, RenderOptions>,
    createSpan: CreateSpan<Data>,
    context?: GenerateSpansContext<Data, RenderOptions>
): void {
    if (typeof input === 'function') {
        // GenerateSpans function
        input(document, createSpan, context);
    } else if (isIterable(input)) {
        // Iterable (arrays, Sets, Maps, custom iterables, etc.) - but not strings
        for (const span of input) {
            if (Array.isArray(span)) {
                // Tuple form, i.e. [start, end, data?]
                createSpan(span[0], span[1], span[2], span[3]);
            } else {
                // Object form, i.e. { start, end, data? }
                createSpan(span.start, span.end, span.data, span.origin);
            }
        }
    }

    // If input is neither a function nor a valid iterable, safely do nothing
}

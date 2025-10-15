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
            generateRanges(source, marker, ranges, renderOptions, buffer),
        [] as GeneratedRange<Data>[]
    );
}

export function generateRanges<Data, RenderOptions>(
    source: string,
    marker: RangeMarker,
    input: Ranges<Data, RenderOptions>,
    renderOptions?: RenderOptions,
    ranges: GeneratedRange<Data>[] = []
) {
    const createRange = (start: number, end: number, data?: Data) => {
        ranges.push({ type: marker, start, end, data });
    };

    if (typeof input === 'function') {
        input(source, createRange, renderOptions);
    } else {
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

    return ranges;
}

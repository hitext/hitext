import type { GeneratedRange, Generator } from './types.d.js';

export function generateRanges<T>(
    source: string,
    generators: Generator<T>[],
    layerOptions?: any
): GeneratedRange<T>[] {
    const ranges: GeneratedRange<T>[] = [];

    for (const { generate, marker } of generators) {
        const createRange = (start: number, end: number, data?: T) => {
            ranges.push({ type: marker, start, end, data });
        };

        generate(source, createRange, layerOptions);
    }

    return ranges;
}

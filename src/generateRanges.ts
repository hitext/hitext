import type { GeneratedRange, Generator } from './types.d.js';

export function generateRanges<T, RenderOptions>(
    source: string,
    generators: Generator<T>[],
    renderOptions?: RenderOptions
): GeneratedRange<T>[] {
    const ranges: GeneratedRange<T>[] = [];

    for (const { generate, marker } of generators) {
        const createRange = (start: number, end: number, data?: T) => {
            ranges.push({ type: marker, start, end, data });
        };

        generate(source, createRange, renderOptions);
    }

    return ranges;
}

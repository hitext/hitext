import type { Range, Generator } from './types.d.js';

export default function generateRanges(source: string, generators: Generator[]) {
    const ranges: Range[] = [];

    generators.forEach(({ generate, marker }) =>
        generate(
            source,
            (start: number, end: number, data: any) => ranges.push({ type: marker, start, end, data })
        )
    );

    return ranges;
};

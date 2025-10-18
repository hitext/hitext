import type { GenerateRanges, Ranges } from '../types.js';
import { generateRanges } from '../ranges.js';
import { rangeMerge } from './merge.js';

export function rangeInvert<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const ranges = generateRanges(source, Symbol('temp'), rangeMerge(input), renderOptions);
        let offset = 0;

        for (const range of ranges) {
            if (offset !== range.start) {
                createRange(offset, range.start);
            }

            offset = range.end;
        }

        if (offset !== source.length) {
            createRange(offset, source.length);
        }
    };
}

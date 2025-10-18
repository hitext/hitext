import type { GenerateRanges, Ranges } from '../types.js';
import { generateRanges } from '../ranges.js';

export function rangeMerge<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const sortedRanges = generateRanges(source, Symbol('temp'), input, renderOptions)
            .sort((a, b) => a.start - b.start || a.end - b.end);

        if (sortedRanges.length > 0) {
            let currentRange = sortedRanges[0];

            for (let i = 1; i < sortedRanges.length; i++) {
                const range = sortedRanges[i];
                if (range.start <= currentRange.end) {
                    currentRange.end = Math.max(range.end, currentRange.end);
                } else {
                    createRange(currentRange.start, currentRange.end);
                    currentRange = range;
                }
            }

            createRange(currentRange.start, currentRange.end);
        }
    };
}

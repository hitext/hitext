import type { GenerateRanges, Ranges } from '../types.js';
import { generateRanges } from '../ranges.js';

export function rangeMerge<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    origins = false
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const sortedRanges = generateRanges(source, input, Symbol('temp'), renderOptions)
            .sort((a, b) => a.start - b.start || a.end - b.end);
        const getOrigin = () => sortedRanges.slice(firstIndex, lastIndex + 1).map(
            ({ start, end, data }) => ({ start, end, data })
        );
        let firstIndex = 0;
        let lastIndex = 0;

        if (sortedRanges.length > 0) {
            let end = sortedRanges[firstIndex].end;

            for (let i = 1; i < sortedRanges.length; i++) {
                const range = sortedRanges[i];

                if (range.start <= end) {
                    lastIndex = i;
                    end = Math.max(range.end, end);
                } else {
                    createRange(sortedRanges[firstIndex].start, end, undefined, origins ? getOrigin() : undefined);
                    firstIndex = lastIndex = i;
                    end = range.end;
                }
            }

            createRange(sortedRanges[firstIndex].start, end, undefined, origins ? getOrigin() : undefined);
        }
    };
}

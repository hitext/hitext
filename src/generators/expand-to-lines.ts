import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { getSharedLineBoundaries } from '../utils/line-boundaries.js';

export function rangeExpandToLines<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    lines = 0,
    linesAfter = lines
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const lineBoundaries = getSharedLineBoundaries(source);

        processRanges(source, input, (start, end, data) => {
            // Get the line start for the range start, going back N lines
            const expandedStart = lineBoundaries.getLineStartForOffset(start, -lines);

            // Get the line end for the range end, going forward N lines
            // Use end-1 for non-empty ranges (last included character), end for empty ranges
            const expandedEnd = lineBoundaries.getLineEndForOffset(
                end > start ? end - 1 : end,
                linesAfter
            );

            createRange(expandedStart, expandedEnd, data);
        }, renderOptions);
    };
}

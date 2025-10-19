import type { GeneratedRange, Ranges, RangeTuple } from '../src/types.js';


export function rangeWithoutMarker<Data>(ranges: GeneratedRange<Data>[]): RangeTuple[] {
    return ranges.map(r => [r.start, r.end, r.data, r.origin]);
}

/**
 * Helper function to extract [start, end, data] tuples from ranges.
 * Useful for asserting range positions and data in tests.
 */
export function startEndData<Data>(ranges: GeneratedRange<Data>[]): Array<[number, number, Data?]> {
    return ranges.map(r => [r.start, r.end, r.data]);
}

/**
 * Helper function to create a RegExpExecArray-like object for testing.
 * This mimics the structure returned by RegExp.exec().
 */
export function regexpMatch(input: string, match: string[] | null, index: number) {
    return match ? Object.assign(match, { input, index, groups: undefined }) : null;
}

/**
 * Helper function to extract ranges from regex matches.
 * Returns an array of [start, end] tuples for each match.
 */
export function getMatchRanges(source: string, regex: RegExp): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    for (const match of source.matchAll(regex)) {
        ranges.push([match.index!, match.index! + match[0].length]);
    }
    return ranges;
}

/**
 * Helper function to render ranges as an array of substrings from the source.
 * This allows us to test range generators directly without using the full pipeline.
 * Preserves the order of ranges as provided.
 */
export function renderRanges<Data, RenderOptions>(
    source: string,
    ranges: Ranges<Data, RenderOptions>,
    renderOptions?: RenderOptions
): string[] {
    const result: string[] = [];

    // Generate ranges using a simple collector
    if (typeof ranges === 'function') {
        ranges(source, (start, end) => {
            result.push(source.slice(start, end));
        }, renderOptions);
    } else {
        for (const range of ranges) {
            const [start, end] = Array.isArray(range) ? range : [range.start, range.end];
            result.push(source.slice(start, end));
        }
    }

    return result;
}

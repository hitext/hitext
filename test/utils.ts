import type { Ranges } from '../src/types.js';

/**
 * Helper function to extract [start, end, data] tuples from ranges.
 * Useful for asserting range positions and data in tests.
 */
export function startEndData<T>(ranges: Array<{ start: number; end: number; data?: T }>): Array<[number, number, T?]> {
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
 */
export function renderRanges(source: string, ranges: Ranges): string[] {
    const result: string[] = [];
    const processedRanges: Array<[number, number]> = [];

    // Generate ranges using a simple collector
    if (typeof ranges === 'function') {
        ranges(source, (start, end) => {
            processedRanges.push([start, end]);
        });
    } else {
        for (const range of ranges) {
            const [start, end] = Array.isArray(range) ? range : [range.start, range.end];
            processedRanges.push([start, end]);
        }
    }

    // Sort ranges by start position
    processedRanges.sort((a, b) => a[0] - b[0]);

    // Extract substrings
    for (const [start, end] of processedRanges) {
        result.push(source.slice(start, end));
    }

    return result;
}

import { deepStrictEqual, strictEqual } from 'assert';
import { rangeInvert, rangeMatch, generateRanges } from '../src/index.js';
import { renderRanges } from './utils.js';

// Helper to extract just [start, end] without data
function startEnd(ranges: Array<{ start: number; end: number }>): Array<[number, number]> {
    return ranges.map(r => [r.start, r.end]);
}

describe('rangeInvert', () => {
    describe('Basic inversion', () => {
        it('should invert single range at start', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5]])
            );

            // Range [0, 5] is excluded, [5, 12] remains (extended end boundary)
            // slice(5, 12) = ' world'
            deepStrictEqual(inverted, [' world']);
        });

        it('should invert single range at end', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[6, 11]])
            );

            // [6, 11] excluded, [0, 6] remains (no empty range after end)
            // slice(0, 6) = 'Hello '
            deepStrictEqual(inverted, ['Hello ']);
        });

        it('should invert single range in middle', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[3, 8]])
            );

            // slice(0, 3) = 'Hel', slice(8, 12) = 'rld'
            deepStrictEqual(inverted, ['Hel', 'rld']);
        });

        it('should invert multiple ranges', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5], [6, 11]])
            );

            // [0, 5] and [6, 11] excluded, [5, 6] remains
            // slice(5, 6) = ' '
            deepStrictEqual(inverted, [' ']);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty ranges (return full source with extended boundary)', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([])
            );

            // No ranges to exclude, [0, 12] returned (extended end boundary)
            // slice(0, 12) = 'Hello world'
            deepStrictEqual(inverted, ['Hello world']);
        });

        it('should handle full range (return empty)', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 11]])
            );

            // Full range excluded, no inverted ranges remain
            deepStrictEqual(inverted, []);
        });

        it('should handle range at document boundaries', () => {
            const inverted = renderRanges(
                'Hello',
                rangeInvert([[0, 0], [5, 5]])
            );

            // Zero-width ranges at start and end don't exclude content
            // [0, 5] remains, extended to [0, 6]
            // slice(0, 6) = 'Hello'
            deepStrictEqual(inverted, ['Hello']);
        });

        it('should handle empty string', () => {
            const inverted = renderRanges(
                '',
                rangeInvert([])
            );

            // Empty source with extended boundaries [0, 1]
            // slice(0, 1) on empty string = ''
            deepStrictEqual(inverted, []);
        });

        it('should handle adjacent ranges', () => {
            const inverted = renderRanges(
                'abcdefgh',
                rangeInvert([[0, 2], [2, 4], [4, 6]])
            );

            // [0,2], [2,4], [4,6] excluded, [6,9] remains
            // slice(6, 9) = 'gh'
            deepStrictEqual(inverted, ['gh']);
        });
    });

    describe('Merging before inversion', () => {
        it('should merge overlapping ranges before inverting', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5], [3, 8]])
            );

            // Merged [0, 8], inverted to [8, 12]
            // slice(8, 12) = 'rld'
            deepStrictEqual(inverted, ['rld']);
        });

        it('should merge adjacent ranges before inverting', () => {
            const inverted = renderRanges(
                '0123456789',
                rangeInvert([[0, 3], [3, 6], [6, 9]])
            );

            // Merged to [0, 9], inverted to [9, 11]
            // slice(9, 11) = '9'
            deepStrictEqual(inverted, ['9']);
        });

        it('should handle nested ranges', () => {
            const inverted = renderRanges(
                '0123456789',
                rangeInvert([[0, 10], [2, 8]])
            );

            // Outer range [0, 10] covers everything, no inverted ranges
            // (offset = 10, which equals source.length)
            deepStrictEqual(inverted, []);
        });

        it('should sort ranges before merging and inverting', () => {
            const inverted = renderRanges(
                '0123456789',
                rangeInvert([[6, 8], [0, 2], [3, 5]])
            );

            // Sorted: [0,2], [3,5], [6,8], inverted to [2,3], [5,6], [8,11]
            // slice(2, 3) = '2', slice(5, 6) = '5', slice(8, 11) = '89'
            deepStrictEqual(inverted, ['2', '5', '89']);
        });
    });

    describe('Integration with generators', () => {
        it('should work with generator function input', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert(rangeMatch(/\w+/g))
            );

            // Words are at [0, 5] and [6, 11], inverted to [5, 6]
            // slice(5, 6) = ' '
            deepStrictEqual(inverted, [' ']);
        });

        it('should invert regex matches', () => {
            const inverted = renderRanges(
                'a1b2c3',
                rangeInvert(rangeMatch(/\d/g))
            );

            // Digits at [1,2], [3,4], [5,6], inverted to [0,1], [2,3], [4,5]
            // slice(0, 1) = 'a', slice(2, 3) = 'b', slice(4, 5) = 'c'
            deepStrictEqual(inverted, ['a', 'b', 'c']);
        });

        it('should work with complex regex', () => {
            const inverted = renderRanges(
                'The quick brown fox',
                rangeInvert(rangeMatch(/\b\w{5}\b/g))
            );

            // Matches "quick" at [4,9] and "brown" at [10,15], inverted to [0,4], [9,10], [15,20]
            // slice(0, 4) = 'The ', slice(9, 10) = ' ', slice(15, 20) = ' fox'
            deepStrictEqual(inverted, ['The ', ' ', ' fox']);
        });
    });

    describe('Multi-line scenarios', () => {
        it('should invert ranges across lines', () => {
            const inverted = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeInvert([[0, 6], [12, 17]])
            );

            // line1\n and line3 are excluded, [6,12] remains
            // slice(6, 12) = 'line2\n'
            deepStrictEqual(inverted, ['line2\n']);
        });

        it('should handle newline inversion', () => {
            const inverted = renderRanges(
                'a\nb\nc',
                rangeInvert(rangeMatch(/\n/g))
            );

            // Newlines at [1,2] and [3,4], inverted to [0,1], [2,3], [4,5]
            // slice(0, 1) = 'a', slice(2, 3) = 'b', slice(4, 5) = 'c'
            deepStrictEqual(inverted, ['a', 'b', 'c']);
        });

        it('should work with line-based ranges', () => {
            const inverted = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n',
                rangeInvert([[6, 12]])
            );

            // line2\n excluded, [0,6], [12,19] remain
            // slice(0, 6) = 'line1\n', slice(12, 19) = 'line3\n'
            deepStrictEqual(inverted, ['line1\n', 'line3\n']);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle many small ranges', () => {
            const inverted = renderRanges(
                '0_1_2_3_4',
                rangeInvert([[1, 2], [3, 4], [5, 6], [7, 8]])
            );

            // Underscores excluded, [0,1], [2,3], [4,5], [6,7], [8,9] remain
            // slice(0, 1) = '0', slice(2, 3) = '1', slice(4, 5) = '2',
            // slice(6, 7) = '3', slice(8, 9) = '4'
            deepStrictEqual(inverted, ['0', '1', '2', '3', '4']);
        });

        it('should work with viewport pattern', () => {
            const source = 'line1\nline2\nMATCH\nline4\nline5';

            // Invert range [12, 17] (MATCH), keeping [0,12], [17,31]
            const inverted = renderRanges(
                source,
                rangeInvert([[12, 17]])
            );

            // slice(0, 12) = 'line1\nline2\n', slice(17, 31) = '\nline4\nline5'
            deepStrictEqual(inverted, ['line1\nline2\n', '\nline4\nline5']);
        });

        it('should handle alternating ranges', () => {
            const inverted = renderRanges(
                'ababababab',
                rangeInvert([[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]])
            );

            // Every 'a' is excluded, [1,2], [3,4], [5,6], [7,8], [9,10] remain
            // slice(1, 2) = 'b', slice(3, 4) = 'b', slice(5, 6) = 'b',
            // slice(7, 8) = 'b', slice(9, 10) = 'b'
            deepStrictEqual(inverted, ['b', 'b', 'b', 'b', 'b']);
        });
    });

    describe('Exact parameter', () => {
        it('should use exact boundaries when exact=true', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5]], true) // exact=true
            );

            // With exact boundaries [0, 11], only [5, 11] remains (no edge empty strings)
            deepStrictEqual(inverted, [' world']);
        });

        it('should not include edge ranges when exact=true and full range is excluded', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 11]], true) // exact=true
            );

            // Full range excluded with exact boundaries, return empty array
            deepStrictEqual(inverted, []);
        });

        it('should use extended boundaries when exact=false (default)', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5]], false) // explicit false
            );

            // With extended boundaries [0, 12], we get [5, 12]
            // slice(5, 12) = ' world'
            deepStrictEqual(inverted, [' world']);
        });

        it('should handle empty string with exact=true', () => {
            const inverted = renderRanges(
                '',
                rangeInvert([], true) // exact=true
            );

            // Empty source with exact boundaries returns empty array
            deepStrictEqual(inverted, []);
        });
    });

    describe('Exact parameter - boundary testing', () => {
        it('should use exact boundaries [0, source.length] when exact=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[5, 6]], true) // Exclude space between Hello and world
            );

            // With exact=true, should get [0, 5] and [6, 11]
            deepStrictEqual(startEnd(ranges), [
                [0, 5],   // 'Hello'
                [6, 11]   // 'world'
            ]);
        });

        it('should use extended boundaries [0, source.length+1] when exact=false', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[5, 6]], false) // Exclude space between Hello and world
            );

            // With exact=false (default), should get [0, 5], [6, 12]
            deepStrictEqual(startEnd(ranges), [
                [0, 5],   // Start at 0: to 'Hello'
                [6, 12]   // Extended end: 'world' to source.length+1
            ]);
        });

        it('should use extended boundaries by default', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[5, 6]]) // No exact parameter = default false
            );

            // Default is exact=false, so extended boundaries [0, source.length+1]
            deepStrictEqual(startEnd(ranges), [
                [0, 5],
                [6, 12]
            ]);
        });

        it('should handle range at start with exact=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 5]], true)
            );

            // Exclude 'Hello', remaining is ' world'
            deepStrictEqual(startEnd(ranges), [[5, 11]]);
        });

        it('should handle range at start with exact=false', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 5]], false)
            );

            // Exclude 'Hello', with extended boundaries get [5, 12]
            deepStrictEqual(startEnd(ranges), [
                [5, 12]   // ' world' with extended end
            ]);
        });

        it('should handle range at end with exact=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[6, 11]], true)
            );

            // Exclude 'world', remaining is 'Hello '
            deepStrictEqual(startEnd(ranges), [[0, 6]]);
        });

        it('should handle range at end with exact=false', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[6, 11]], false)
            );

            // Exclude 'world', with extended boundaries get [0, 6]
            // (no empty range at end since offset === source.length)
            deepStrictEqual(startEnd(ranges), [
                [0, 6]   // 'Hello '
            ]);
        });

        it('should handle full range exclusion with exact=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 11]], true)
            );

            // Everything excluded, no ranges
            deepStrictEqual(startEnd(ranges), []);
        });

        it('should handle full range exclusion with exact=false', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 11]], false)
            );

            // Everything excluded, no ranges remain
            // (offset === source.length, so no final range created)
            deepStrictEqual(startEnd(ranges), []);
        });

        it('should handle empty input with exact=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([], true)
            );

            // No exclusions, entire source
            deepStrictEqual(startEnd(ranges), [[0, 11]]);
        });

        it('should handle empty input with exact=false', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([], false)
            );

            // No exclusions, with extended end boundary [0, 12]
            deepStrictEqual(startEnd(ranges), [[0, 12]]);
        });

        it('should handle multiple ranges with exact=true', () => {
            const source = 'a b c d';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 1], [2, 3], [4, 5]], true) // Exclude 'a', 'b', 'c'
            );

            // Remaining: ' ' (index 1-2), ' ' (index 3-4), ' d' (index 5-7)
            deepStrictEqual(startEnd(ranges), [
                [1, 2],
                [3, 4],
                [5, 7]
            ]);
        });

        it('should handle multiple ranges with exact=false', () => {
            const source = 'a b c d';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 1], [2, 3], [4, 5]], false) // Exclude 'a', 'b', 'c'
            );

            // With extended end boundary
            deepStrictEqual(startEnd(ranges), [
                [1, 2],   // ' ' between a and b
                [3, 4],   // ' ' between b and c
                [5, 8]    // ' d' with extended end
            ]);
        });
    });

    describe('Origin tracking', () => {
        it('should not create origin for inverted ranges (they are synthetic)', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeInvert([[0, 5]])
            );

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].origin, undefined);
            strictEqual(ranges[0].start, 5);
            strictEqual(ranges[0].end, 12);
        });

        it('should not preserve origin even when input has origins', () => {
            const source = 'Hello world';
            const inputWithOrigin = [{ start: 0, end: 5, data: 'test', origin: { start: 100, end: 105, data: 'original' } }];
            const ranges = generateRanges(
                source,
                rangeInvert(inputWithOrigin)
            );

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].origin, undefined);
        });
    });
});

import { deepStrictEqual } from 'assert';
import { rangeCombine, rangeMatch, rangeMerge, generateRanges } from '../../src/index.js';
import { getMatchRanges, renderRanges, rangeWithoutMarker } from '../utils.js';

describe('rangeMerge', () => {
    describe('Basic merging', () => {
        it('should merge overlapping ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 5], [3, 8], [6, 11]])
            );

            // All three ranges overlap, should merge into one
            deepStrictEqual(merged, ['Hello world']);
        });

        it('should merge adjacent ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 5], [5, 11]])
            );

            // Adjacent ranges (touching at position 5) should merge
            deepStrictEqual(merged, ['Hello world']);
        });

        it('should not merge non-overlapping ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 5], [6, 11]])
            );

            // Gap between ranges (position 5-6), should stay separate
            deepStrictEqual(merged, ['Hello', 'world']);
        });

        it('should handle single range', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 5]])
            );

            deepStrictEqual(merged, ['Hello']);
        });

        it('should handle empty ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([])
            );

            deepStrictEqual(merged, []);
        });
    });

    describe('Sorting and ordering', () => {
        it('should sort ranges before merging', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[6, 11], [0, 5], [3, 8]])
            );

            // Out of order input, should sort then merge overlapping ranges
            deepStrictEqual(merged, ['Hello world']);
        });

        it('should handle ranges in reverse order', () => {
            const merged = renderRanges(
                'abcdefghij',
                rangeMerge([[8, 10], [4, 6], [0, 2]])
            );

            // Non-overlapping ranges in reverse order
            deepStrictEqual(merged, ['ab', 'ef', 'ij']);
        });

        it('should handle randomly ordered overlapping ranges', () => {
            const merged = renderRanges(
                '0123456789',
                rangeMerge([[5, 7], [1, 3], [2, 6], [8, 10]])
            );

            // Ranges [1,3], [2,6], [5,7] overlap → merge to [1,7]
            // Range [8,10] stays separate
            deepStrictEqual(merged, ['123456', '89']);
        });
    });

    describe('Nested ranges', () => {
        it('should handle nested ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 11], [3, 8]])
            );

            // [3,8] is completely inside [0,11], should merge to [0,11]
            deepStrictEqual(merged, ['Hello world']);
        });

        it('should handle multiple nested ranges', () => {
            const merged = renderRanges(
                '0123456789',
                rangeMerge([[0, 10], [2, 4], [5, 7], [1, 9]])
            );

            // All ranges nested within [0,10], should merge to [0,10]
            deepStrictEqual(merged, ['0123456789']);
        });

        it('should handle partially nested ranges', () => {
            const merged = renderRanges(
                '0123456789',
                rangeMerge([[0, 5], [2, 7], [6, 10]])
            );

            // All ranges partially overlap, should merge to [0,10]
            deepStrictEqual(merged, ['0123456789']);
        });
    });

    describe('Integration with rangeMatch', () => {
        it('should work with generator function input', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge(rangeMatch(/\w+/g))
            );

            // Two word matches with space between, should not merge
            deepStrictEqual(merged, ['Hello', 'world']);
        });

        it('should merge overlapping regex matches', () => {
            const merged = renderRanges(
                'abc123def456',
                rangeMerge(rangeMatch(/\w+/g))
            );

            // Single continuous word match
            deepStrictEqual(merged, ['abc123def456']);
        });

        it('should merge matches with custom ranges', () => {
            const source = 'Find ERROR1 and ERROR2 here';
            const merged = renderRanges(
                source,
                rangeMerge([
                    ...getMatchRanges(source, /ERROR\d/g),
                    [5, 22]  // Range that spans both ERROR matches
                ])
            );

            // Custom range [5, 22] spans "ERROR1 and ERROR2", merges with matches
            deepStrictEqual(merged, ['ERROR1 and ERROR2']);
        });
    });

    describe('Edge cases', () => {
        it('should handle zero-length ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 0], [5, 5], [11, 11]])
            );

            // Zero-length ranges produce empty strings
            deepStrictEqual(merged, ['', '', '']);
        });

        it('should handle ranges at document boundaries', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 1], [10, 11]])
            );

            // First and last characters
            deepStrictEqual(merged, ['H', 'd']);
        });

        it('should handle many small overlapping ranges', () => {
            const merged = renderRanges(
                '0123456789',
                rangeMerge([
                    [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
                    [5, 7], [6, 8], [7, 9], [8, 10]
                ])
            );

            // Chain of overlapping ranges, should merge to entire string
            deepStrictEqual(merged, ['0123456789']);
        });

        it('should handle duplicate ranges', () => {
            const merged = renderRanges(
                'Hello world',
                rangeMerge([[0, 5], [0, 5], [0, 5]])
            );

            // Duplicate ranges should merge to single range
            deepStrictEqual(merged, ['Hello']);
        });
    });

    describe('Multi-line scenarios', () => {
        it('should merge ranges across lines', () => {
            const merged = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeMerge([[0, 6], [6, 12], [12, 17]])
            );

            // Adjacent ranges spanning all three lines
            deepStrictEqual(merged, [
                'line1\n' +
                'line2\n' +
                'line3'
            ]);
        });

        it('should merge overlapping ranges on different lines', () => {
            const merged = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeMerge([[0, 8], [5, 14], [10, 17]])
            );

            // Overlapping ranges across lines should merge
            deepStrictEqual(merged, [
                'line1\n' +
                'line2\n' +
                'line3'
            ]);
        });

        it('should not merge non-overlapping ranges on different lines', () => {
            const merged = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4',
                rangeMerge([[0, 6], [12, 18]])
            );

            // line1 and line3, with line2 in between
            deepStrictEqual(merged, [
                'line1\n',
                'line3\n'
            ]);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle mix of overlapping and non-overlapping ranges', () => {
            const merged = renderRanges(
                '0123456789ABCDEFGHIJ',
                rangeMerge([
                    [0, 3],   // "012"
                    [2, 5],   // "234" - overlaps with previous
                    [7, 9],   // "78" - separate
                    [8, 12],  // "89AB" - overlaps with previous
                    [15, 18], // "FGH" - separate
                    [17, 20]  // "HIJ" - overlaps with previous
                ])
            );

            // Should merge to three groups: [0,5], [7,12], [15,20]
            deepStrictEqual(merged, ['01234', '789AB', 'FGHIJ']);
        });

        it('should handle ranges with varying sizes', () => {
            const merged = renderRanges(
                'The quick brown fox jumps over the lazy dog',
                rangeMerge([
                    [0, 3],   // "The"
                    [4, 9],   // "quick"
                    [10, 15], // "brown"
                    [0, 15],  // Entire first part - overlaps all above
                    [35, 39], // "lazy" - separate
                    [40, 43]  // "dog" - adjacent to previous
                ])
            );

            // First three merge with [0,15], last two should be separate (gap at position 39-40)
            deepStrictEqual(merged, ['The quick brown', 'lazy', 'dog']);
        });

        it('should merge result of multiple match operations', () => {
            const source = 'ERROR: code 123, WARNING: check logs, ERROR: again';
            const merged = renderRanges(
                source,
                rangeMerge(
                    rangeCombine([
                        rangeMatch(/ERROR/g),
                        rangeMatch(/WARNING/g)
                    ])
                )
            );

            // Should preserve separate ERROR and WARNING matches
            deepStrictEqual(merged, ['ERROR', 'WARNING', 'ERROR']);
        });
    });

    describe('Origin tracking', () => {
        it('should not include origins by default', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeMerge([[0, 5], [3, 8], [6, 11]]) // Three overlapping ranges
            );

            deepStrictEqual(rangeWithoutMarker(ranges), [
                [0, 11, undefined, undefined]
            ]);
        });

        it('should include origins when origins=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeMerge([[0, 5], [3, 8], [6, 11]], true) // Three overlapping ranges with origins
            );

            deepStrictEqual(rangeWithoutMarker(ranges), [
                [0, 11, undefined, [
                    { start: 0, end: 5, data: undefined, origin: undefined },
                    { start: 3, end: 8, data: undefined, origin: undefined },
                    { start: 6, end: 11, data: undefined, origin: undefined }
                ]]
            ]);
        });

        it('should include origins for non-overlapping ranges when origins=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeMerge([[0, 5], [6, 11]], true) // Two non-overlapping ranges
            );

            deepStrictEqual(rangeWithoutMarker(ranges), [
                [0, 5, undefined, [
                    { start: 0, end: 5, data: undefined, origin: undefined }
                ]],
                [6, 11, undefined, [
                    { start: 6, end: 11, data: undefined, origin: undefined }
                ]]
            ]);
        });

        it('should handle single range with origins=true', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeMerge([[0, 5]], true) // Single range
            );

            deepStrictEqual(rangeWithoutMarker(ranges), [
                [0, 5, undefined, [
                    { start: 0, end: 5, data: undefined, origin: undefined}
                ]]
            ]);
        });

        it('should explicitly not include origins when origins=false', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeMerge([[0, 5], [3, 8]], false)
            );

            deepStrictEqual(rangeWithoutMarker(ranges), [
                [0, 8, undefined, undefined]
            ]);
        });
    });
});

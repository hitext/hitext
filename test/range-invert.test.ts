import { deepStrictEqual } from 'assert';
import { rangeInvert, rangeMatch } from '../src/index.js';
import { renderRanges } from './utils.js';

describe('rangeInvert', () => {
    describe('Basic inversion', () => {
        it('should invert single range at start', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5]])
            );

            // Range [0, 5] is excluded, so [5, 11] remains
            deepStrictEqual(inverted, [' world']);
        });

        it('should invert single range at end', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[6, 11]])
            );

            // Range [6, 11] is excluded, so [0, 6] remains
            deepStrictEqual(inverted, ['Hello ']);
        });

        it('should invert single range in middle', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[3, 8]])
            );

            deepStrictEqual(inverted, ['Hel', 'rld']);
        });

        it('should invert multiple ranges', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5], [6, 11]])
            );

            deepStrictEqual(inverted, [' ']);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty ranges (return full source)', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([])
            );

            deepStrictEqual(inverted, ['Hello world']);
        });

        it('should handle full range (return empty)', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 11]])
            );

            deepStrictEqual(inverted, []);
        });

        it('should handle range at document boundaries', () => {
            const inverted = renderRanges(
                'Hello',
                rangeInvert([[0, 0], [5, 5]])
            );

            deepStrictEqual(inverted, ['Hello']);
        });

        it('should handle empty string', () => {
            const inverted = renderRanges(
                '',
                rangeInvert([])
            );

            // Empty source with no ranges returns empty
            deepStrictEqual(inverted, []);
        });

        it('should handle adjacent ranges', () => {
            const inverted = renderRanges(
                'abcdefgh',
                rangeInvert([[0, 2], [2, 4], [4, 6]])
            );

            deepStrictEqual(inverted, ['gh']);
        });
    });

    describe('Merging before inversion', () => {
        it('should merge overlapping ranges before inverting', () => {
            const inverted = renderRanges(
                'Hello world',
                rangeInvert([[0, 5], [3, 8]])
            );

            // Merged [0, 8], inverted to [8, 11]
            deepStrictEqual(inverted, ['rld']);
        });

        it('should merge adjacent ranges before inverting', () => {
            const inverted = renderRanges(
                '0123456789',
                rangeInvert([[0, 3], [3, 6], [6, 9]])
            );

            // Merged to [0, 9], inverted to [9, 10]
            deepStrictEqual(inverted, ['9']);
        });

        it('should handle nested ranges', () => {
            const inverted = renderRanges(
                '0123456789',
                rangeInvert([[0, 10], [2, 8]])
            );

            // Outer range [0, 10] covers everything, inverted to empty
            deepStrictEqual(inverted, []);
        });

        it('should sort ranges before merging and inverting', () => {
            const inverted = renderRanges(
                '0123456789',
                rangeInvert([[6, 8], [0, 2], [3, 5]])
            );

            // Sorted: [0,2], [3,5], [6,8], inverted to [2,3], [5,6], [8,10]
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
            deepStrictEqual(inverted, [' ']);
        });

        it('should invert regex matches', () => {
            const inverted = renderRanges(
                'a1b2c3',
                rangeInvert(rangeMatch(/\d/g))
            );

            // Digits at [1,2], [3,4], [5,6], inverted to [0,1], [2,3], [4,5]
            deepStrictEqual(inverted, ['a', 'b', 'c']);
        });

        it('should work with complex regex', () => {
            const inverted = renderRanges(
                'The quick brown fox',
                rangeInvert(rangeMatch(/\b\w{5}\b/g))
            );

            // Matches "quick" and "brown", inverted to everything else
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

            // line1\n and line3 are inverted, line2\n remains
            deepStrictEqual(inverted, ['line2\n']);
        });

        it('should handle newline inversion', () => {
            const inverted = renderRanges(
                'a\nb\nc',
                rangeInvert(rangeMatch(/\n/g))
            );

            // Newlines at [1,2] and [3,4], inverted to letters
            deepStrictEqual(inverted, ['a', 'b', 'c']);
        });

        it('should work with line-based ranges', () => {
            const inverted = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n',
                rangeInvert([[6, 12]])
            );

            // line2\n is inverted, line1\n and line3\n remain
            deepStrictEqual(inverted, ['line1\n', 'line3\n']);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle many small ranges', () => {
            const inverted = renderRanges(
                '0_1_2_3_4',
                rangeInvert([[1, 2], [3, 4], [5, 6], [7, 8]])
            );

            // Underscores are inverted, digits remain
            deepStrictEqual(inverted, ['0', '1', '2', '3', '4']);
        });

        it('should work with viewport pattern', () => {
            const source = 'line1\nline2\nMATCH\nline4\nline5';
            
            // Invert range [12, 17] (MATCH), keeping everything else
            const inverted = renderRanges(
                source,
                rangeInvert([[12, 17]])
            );

            deepStrictEqual(inverted, ['line1\nline2\n', '\nline4\nline5']);
        });

        it('should handle alternating ranges', () => {
            const inverted = renderRanges(
                'ababababab',
                rangeInvert([[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]])
            );

            // Every 'a' is inverted, every 'b' remains
            deepStrictEqual(inverted, ['b', 'b', 'b', 'b', 'b']);
        });
    });
});

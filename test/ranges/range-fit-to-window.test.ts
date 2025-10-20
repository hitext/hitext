import { deepStrictEqual, strictEqual } from 'assert';
import { rangeMatch, rangeFitToWindow, generateRanges } from '../../src/index.js';
import { renderRanges } from '../utils.js';

describe('rangeFitToWindow', () => {
    describe('Basic window expansion', () => {
        it('should expand small range to fit window size', () => {
            const windows = renderRanges(
                'Lorem ipsum dolor sit amet ERROR consectetur adipiscing elit',
                rangeFitToWindow(rangeMatch(/ERROR/g), 35)
            );

            // ERROR (5 chars) expanded to 35 char window, balanced: 15 left + 5 match + 15 right
            deepStrictEqual(windows, ['dolor sit amet ERROR consectetur ad']);
        });

        it('should expand symmetrically when space available', () => {
            const windows = renderRanges(
                'a'.repeat(30) + 'ERROR' + 'b'.repeat(30),
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // Window size 25, match is 5, room is 20, split as 10 left + 10 right
            deepStrictEqual(windows, ['a'.repeat(10) + 'ERROR' + 'b'.repeat(10)]);
        });

        it('should use default window size (80) when not specified', () => {
            const windows = renderRanges(
                'a'.repeat(40) + 'ERROR' + 'b'.repeat(60),
                rangeFitToWindow(rangeMatch(/ERROR/g))
            );

            // Default size 80, match is 5, room is 75, split as 37/38
            deepStrictEqual(windows, ['a'.repeat(37) + 'ERROR' + 'b'.repeat(38)]);
        });

        it('should show entire range when smaller than window', () => {
            const windows = renderRanges(
                'Short ERROR',
                rangeFitToWindow(rangeMatch(/ERROR/g), 50)
            );

            // Entire text is only 11 chars, fits in 50 char window
            deepStrictEqual(windows, ['Short ERROR']);
        });
    });

    describe('Smart padding', () => {
        it('should expand right when limited on left (near start)', () => {
            const windows = renderRanges(
                'ERROR at the very start of this long line',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // Window size 25, match is 5, room is 20. Only 0 chars left, so gives all 20 to right
            deepStrictEqual(windows, ['ERROR at the very start o']);
        });

        it('should expand left when limited on right (near end)', () => {
            const windows = renderRanges(
                'This is a long line that ends with ERROR',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // Window size 25, match is 5, room is 20. Only 0 chars right, so gives all 20 to left
            deepStrictEqual(windows, ['line that ends with ERROR']);
        });

        it('should show entire line when shorter than window', () => {
            const windows = renderRanges(
                'Short ERROR line',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // Line is 16 chars, fits in 25 char window
            deepStrictEqual(windows, ['Short ERROR line']);
        });

        it('should use excess from constrained side on other side', () => {
            const windows = renderRanges(
                'ab' + 'ERROR' + 'c'.repeat(50),
                rangeFitToWindow(rangeMatch(/ERROR/g), 20)
            );

            // Window size 20, match is 5, room is 15
            // Ideally 7 left + 8 right, but only 2 chars left
            // So: 2 left + 5 match + 13 right = 20 chars
            deepStrictEqual(windows, ['abERROR' + 'c'.repeat(13)]);
        });
    });

    describe('Trimming long ranges', () => {
        it('should trim ranges longer than window size (default behavior)', () => {
            const windows = renderRanges(
                'a'.repeat(50) + 'ERROR' + 'b'.repeat(50),
                rangeFitToWindow(rangeMatch(/a+ERROR/g), 30)
            );

            // Match is 55 chars (50 + 5), window is 30, should trim from right to first 30 chars
            deepStrictEqual(windows, ['a'.repeat(30)]);
        });

        it('should preserve long ranges when allowTrimming is false', () => {
            const windows = renderRanges(
                'a'.repeat(50) + 'ERROR' + 'b'.repeat(50),
                rangeFitToWindow(rangeMatch(/a+ERROR/g), 30, false)
            );

            // Match is 55 chars, allowTrimming=false, keeps entire match
            deepStrictEqual(windows, ['a'.repeat(50) + 'ERROR']);
        });

        it('should trim exactly to size from right', () => {
            const windows = renderRanges(
                'prefix VERYLONGMATCHDATA suffix',
                rangeFitToWindow(rangeMatch(/VERYLONGMATCHDATA/g), 10)
            );

            // Match is 17 chars, window is 10, trim to first 10 chars
            deepStrictEqual(windows, ['VERYLONGMA']);
        });
    });

    describe('Multi-line handling', () => {
        it('should respect line boundaries for each match', () => {
            const windows = renderRanges(
                'Line 1 with ERROR1 in the middle\n' +
                'Short ERROR2 line\n' +
                'Line 3 with ERROR3 here',
                rangeFitToWindow(rangeMatch(/ERROR\d/g), 22)
            );

            // Each match gets its own window, constrained by line boundaries
            // Line 1: " 1 with ERROR1 in the " (22 chars fits, smart padding)
            // Line 2: entire line is 18 chars, fits in 22 char window
            // Line 3: "ine 3 with ERROR3 here" (22 chars, smart padding)
            deepStrictEqual(windows, [
                ' 1 with ERROR1 in the ',
                'Short ERROR2 line',
                'ine 3 with ERROR3 here'
            ]);
        });

        it('should not merge overlapping windows (separate ranges)', () => {
            const windows = renderRanges(
                'Find ERROR1 and ERROR2 in this line',
                rangeFitToWindow(rangeMatch(/ERROR\d/g), 16)
            );

            // Each match gets its own window (no automatic merging)
            deepStrictEqual(windows, [
                'Find ERROR1 and ',      // 16 chars, smart padding
                ' and ERROR2 in t'       // 16 chars, smart padding
            ]);
        });

        it('should not merge windows across newlines', () => {
            const windows = renderRanges(
                'Line 1 ERROR1\n' +
                'Line 2 ERROR2',
                rangeFitToWindow(rangeMatch(/ERROR\d/g), 25)
            );

            // Separate windows for each line
            deepStrictEqual(windows, [
                'Line 1 ERROR1',
                'Line 2 ERROR2'
            ]);
        });

        it('should handle match that spans entire line', () => {
            const windows = renderRanges(
                'Very long line before\n' +
                'ERROR\n' +
                'Very long line after',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // The line with ERROR is only 5 chars, fits in 25 char window
            deepStrictEqual(windows, ['ERROR']);
        });
    });

    describe('Edge cases', () => {
        it('should handle match at start of source', () => {
            const windows = renderRanges(
                'ERROR at the start',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // Entire source is only 18 chars, fits in 25 char window
            deepStrictEqual(windows, ['ERROR at the start']);
        });

        it('should handle match at end of source', () => {
            const windows = renderRanges(
                'Ends with ERROR',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // Entire source is only 15 chars, fits in 25 char window
            deepStrictEqual(windows, ['Ends with ERROR']);
        });

        it('should handle match that is entire source', () => {
            const windows = renderRanges(
                'ERROR',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            deepStrictEqual(windows, ['ERROR']);
        });

        it('should handle leading whitespace in line', () => {
            const windows = renderRanges(
                '        ERROR in indented line',
                rangeFitToWindow(rangeMatch(/ERROR/g), 26)
            );

            // Window includes leading whitespace (all chars treated equally)
            // Match is 5 chars, window is 26, room is 21
            // Available: 8 left, 20 right. Ideal: 10 left + 11 right, but only 8 left
            // So: 8 left + 5 match + 13 right = 26 chars total
            deepStrictEqual(windows, ['        ERROR in indented ']);
        });

        it('should handle empty source', () => {
            const windows = renderRanges(
                '',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // No matches, no windows
            deepStrictEqual(windows, []);
        });

        it('should handle no matches', () => {
            const windows = renderRanges(
                'No matches here',
                rangeFitToWindow(rangeMatch(/ERROR/g), 25)
            );

            // No matches, no windows
            deepStrictEqual(windows, []);
        });

        it('should handle very large window size', () => {
            const windows = renderRanges(
                'a'.repeat(100) + 'ERROR' + 'b'.repeat(100),
                rangeFitToWindow(rangeMatch(/ERROR/g), 1000)
            );

            // Window size 1000, but line is only 205 chars
            deepStrictEqual(windows, ['a'.repeat(100) + 'ERROR' + 'b'.repeat(100)]);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple matches with varying contexts', () => {
            const windows = renderRanges(
                'ERROR1 at start, middle ERROR2 here, and ends with ERROR3',
                rangeFitToWindow(rangeMatch(/ERROR\d/g), 22)
            );

            // Each match gets its own window (no merging), with smart padding
            deepStrictEqual(windows, [
                'ERROR1 at start, middl',  // 0 left + 22 right (smart padding)
                ' middle ERROR2 here, a',   // 8 left + 6 match + 8 right
                ', and ends with ERROR3'    // 16 left + 6 match + 0 right (smart padding)
            ]);
        });

        it('should handle the problematic multi-line case', () => {
            const windows = renderRanges(
                'function calculate(value) {\n' +
                '    if (value == null) { // comment\n' +
                '        return 0;\n' +
                '    }\n' +
                '    return value * 2;\n' +
                '}',
                rangeFitToWindow(rangeMatch(/return/g), 20)
            );

            // Two 'return' matches
            // Line 3 "        return 0;" is 17 chars, fits in 20
            // Line 5 "    return value * 2;" is 23 chars, needs trimming or smart expansion
            // Actually it's 22 chars without the semicolon in window calc (check line boundary)
            deepStrictEqual(windows, [
                '        return 0;',           // Line 3: entire line is 17 chars, fits in 20
                '    return value * 2'         // Line 5: window is 20 chars
            ]);
        });

        it('should handle line with extra leading whitespace', () => {
            const windows = renderRanges(
                'Line 1\n' +
                '               return value * 2;\n' +  // 15 leading spaces
                'Line 3',
                rangeFitToWindow(rangeMatch(/return/g), 26)
            );

            // Window: 10 chars before 'return' (spaces) + return + 10 chars after
            deepStrictEqual(windows, ['          return value * 2']);
        });
    });

    describe('Multiline range trimming', () => {
        it('should always trim multiline ranges to first line', () => {
            const windows = renderRanges(
                'Line 1 with ERROR1\n' +
                'Line 2 continues here\n' +
                'Line 3',
                rangeFitToWindow(rangeMatch(/ERROR1\nLine 2/g), 80)
            );

            // Multiline ranges are automatically trimmed to first line
            deepStrictEqual(windows, ['Line 1 with ERROR1']);
        });

        it('should handle multiline range that spans many lines', () => {
            const windows = renderRanges(
                'Line 1\n' +
                'Line 2 start\n' +
                'Line 3 middle\n' +
                'Line 4 end\n' +
                'Line 5',
                rangeFitToWindow(rangeMatch(/start\nLine 3 middle\nLine 4 end/g), 50)
            );

            // Should trim to first line only: "Line 2 start"
            deepStrictEqual(windows, ['Line 2 start']);
        });

        it('should apply window fitting after trimming multiline range', () => {
            const windows = renderRanges(
                'This is a very long line with ERROR1\n' +
                'Line 2 continues here',
                rangeFitToWindow(rangeMatch(/ERROR1\nLine 2/g), 20)
            );

            // Trim to first line, then fit into 20 char window
            // "ERROR1" is 6 chars, window is 20, room is 14
            // Ideal: 7 left + 6 match + 7 right
            // Available left: "This is a very long line with " (31 chars before ERROR1)
            // Available right: 0 chars (newline after ERROR1)
            // So: 7 left + 6 match + 7 right, but only 0 available right
            // Give excess to left: 14 left + 6 match = 20 chars
            deepStrictEqual(windows, ['ong line with ERROR1']);
        });
    });

    describe('Origin tracking', () => {
        it('should create origin when input has no origin', () => {
            const source = 'Lorem ipsum dolor sit amet ERROR consectetur';
            const ranges = generateRanges(
                source,
                rangeFitToWindow([[27, 32]], 35)
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, { start: 27, end: 32, data: undefined });
        });

        it('should preserve origin when input already has origin', () => {
            const source = 'Lorem ipsum dolor sit amet ERROR consectetur';
            const inputWithOrigin = [{ start: 27, end: 32, data: 'test', origin: { start: 100, end: 105, data: 'original' } }];
            const ranges = generateRanges(
                source,
                rangeFitToWindow(inputWithOrigin, 35)
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, { start: 100, end: 105, data: 'original' });
        });
    });
});

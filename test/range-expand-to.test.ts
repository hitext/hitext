import { deepStrictEqual } from 'assert';
import { rangeExpandTo, generateRanges } from '../src/index.js';
import { startEndData } from './utils.js';

// Helper to extract just [start, end] without data
function startEnd(ranges: Array<{ start: number; end: number }>): Array<[number, number]> {
    return ranges.map(r => [r.start, r.end]);
}

describe('rangeExpandTo', () => {
    describe('Position: line', () => {
        it('should expand range to full line boundaries (including newlines)', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'line') // "in" from "line2"
            );

            // Should expand to full line2 including newline
            deepStrictEqual(startEnd(ranges), [[6, 12]]);
        });

        it('should work without trailing newline', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'line') // "ne" from "line3"
            );

            // Last line has no newline
            deepStrictEqual(startEnd(ranges), [[12, 17]]);
        });

        it('should expand with context lines', () => {
            const source = 'line1\nline2\nline3\nline4\nline5';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'line', 1) // "ne" from "line3", ±1 line
            );

            // Should include line2, line3, line4
            deepStrictEqual(startEnd(ranges), [[6, 24]]);
        });

        it('should handle asymmetric context', () => {
            const source = 'line1\nline2\nline3\nline4\nline5';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'line', [1, 2]) // "ne" from "line3", 1 before, 2 after
            );

            // Should include line2, line3, line4, line5
            deepStrictEqual(startEnd(ranges), [[6, 29]]);
        });
    });

    describe('Position: lineContent', () => {
        it('should expand to line content (excluding newlines)', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'lineContent') // "in" from "line2"
            );

            // Should expand to line2 content without newline
            deepStrictEqual(startEnd(ranges), [[6, 11]]);
        });

        it('should work without trailing newline', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'lineContent') // "ne" from "line3"
            );

            // Last line has no newline, same result
            deepStrictEqual(startEnd(ranges), [[12, 17]]);
        });

        it('should work with CRLF', () => {
            const source = 'line1\r\nline2\r\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[9, 11]], 'lineContent') // "ne" from "line2"
            );

            // Should exclude \r\n
            deepStrictEqual(startEnd(ranges), [[7, 12]]);
        });

        it('should expand with context lines', () => {
            const source = 'line1\nline2\nline3\nline4\nline5';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'lineContent', 1) // "ne" from "line3", ±1 line
            );

            // Should include line2, line3, line4 content without final newline
            deepStrictEqual(startEnd(ranges), [[6, 23]]);
        });

        it('should support tuple syntax for asymmetric context', () => {
            const source = 'line1\nline2\nline3\nline4\nline5';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'lineContent', [1, 2]) // "ne" from "line3", 1 before, 2 after
            );

            // Should include line2, line3, line4, line5 content without final newline
            deepStrictEqual(startEnd(ranges), [[6, 29]]);
        });
    });

    describe('Position: lineStart', () => {
        it('should expand start to line start, keep original end', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'lineStart') // "in" from "line2"
            );

            // Should expand start to beginning of line2, keep end at 9
            deepStrictEqual(startEnd(ranges), [[6, 9]]);
        });

        it('should not expand end', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 11]], 'lineStart') // "ine2" from "line2"
            );

            // Start expands to line start, end stays at 11
            deepStrictEqual(startEnd(ranges), [[6, 11]]);
        });

        it('should respect lines parameter for start', () => {
            const source = 'line1\nline2\nline3\nline4';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'lineStart', 1) // "ne" from "line3", -1 line
            );

            // Should expand start to line2, keep end at 15
            deepStrictEqual(startEnd(ranges), [[6, 15]]);
        });
    });

    describe('Position: lineEnd', () => {
        it('should keep original start, expand end to line end (including newline)', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'lineEnd') // "in" from "line2"
            );

            // Should keep start at 7, expand end to after newline
            deepStrictEqual(startEnd(ranges), [[7, 12]]);
        });

        it('should expand end to line end without trailing newline', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'lineEnd') // "ne" from "line3"
            );

            // Should keep start at 13, expand end to 17
            deepStrictEqual(startEnd(ranges), [[13, 17]]);
        });

        it('should respect linesAfter parameter', () => {
            const source = 'line1\nline2\nline3\nline4';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'lineEnd', [0, 1]) // "in" from "line2", +1 line after
            );

            // Should keep start at 7, expand end through line3's newline
            deepStrictEqual(startEnd(ranges), [[7, 18]]);
        });
    });

    describe('Position: lineContentEnd', () => {
        it('should keep original start, expand end to line content end (excluding newline)', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'lineContentEnd') // "in" from "line2"
            );

            // Should keep start at 7, expand end to before newline
            deepStrictEqual(startEnd(ranges), [[7, 11]]);
        });

        it('should work without trailing newline', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[13, 15]], 'lineContentEnd') // "ne" from "line3"
            );

            // Should keep start at 13, expand end to 17
            deepStrictEqual(startEnd(ranges), [[13, 17]]);
        });

        it('should work with CRLF', () => {
            const source = 'line1\r\nline2\r\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[9, 11]], 'lineContentEnd') // "ne" from "line2"
            );

            // Should keep start at 9, expand end to before \r\n
            deepStrictEqual(startEnd(ranges), [[9, 12]]);
        });

        it('should respect linesAfter parameter', () => {
            const source = 'line1\nline2\nline3\nline4';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'lineContentEnd', [0, 1]) // "in" from "line2", +1 line after
            );

            // Should keep start at 7, expand end through line3 content
            deepStrictEqual(startEnd(ranges), [[7, 17]]);
        });
    });

    describe('Multiline ranges', () => {
        it('should handle multiline range with line mode', () => {
            const source = 'line1\nline2\nline3\nline4';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 15]], 'line') // from "in" of line2 to "ne" of line3
            );

            // Should expand to full line2 and line3
            deepStrictEqual(startEnd(ranges), [[6, 18]]);
        });

        it('should handle multiline range with lineContent mode', () => {
            const source = 'line1\nline2\nline3\nline4';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 15]], 'lineContent') // from "in" of line2 to "ne" of line3
            );

            // Should expand to line2-line3 content without final newline
            deepStrictEqual(startEnd(ranges), [[6, 17]]);
        });
    });

    describe('Data preservation', () => {
        it('should preserve data when expanding', () => {
            const source = 'line1\nline2\nline3';
            const input = [{ start: 7, end: 9, data: { type: 'match' } }];
            const ranges = generateRanges(source, rangeExpandTo(input, 'line'));

            deepStrictEqual(startEndData(ranges), [
                [6, 12, { type: 'match' }]
            ]);
        });

        it('should preserve existing data with lineContent mode', () => {
            const source = 'line1\nline2\nline3';
            const input = [{ start: 7, end: 9, data: { id: 42, text: 'test' } }];
            const ranges = generateRanges(source, rangeExpandTo(input, 'lineContent'));

            deepStrictEqual(startEndData(ranges), [
                [6, 11, { id: 42, text: 'test' }]
            ]);
        });

        it('should work with ranges without initial data', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeExpandTo([[7, 9]], 'lineStart'));

            deepStrictEqual(startEndData(ranges), [
                [6, 9, undefined]
            ]);
        });
    });

    describe('Edge cases', () => {
        it('should handle zero-width range', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 7]], 'line')
            );

            // Should expand to full line2
            deepStrictEqual(startEnd(ranges), [[6, 12]]);
        });

        it('should handle range at start of source', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[0, 2]], 'line')
            );

            // Should expand to full line1
            deepStrictEqual(startEnd(ranges), [[0, 6]]);
        });

        it('should handle range at end of source', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[15, 17]], 'line')
            );

            // Should expand to full line3 (no trailing newline)
            deepStrictEqual(startEnd(ranges), [[12, 17]]);
        });

        it('should handle empty source', () => {
            const source = '';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[0, 0]], 'line')
            );

            // Empty remains empty
            deepStrictEqual(startEnd(ranges), [[0, 0]]);
        });
    });
});

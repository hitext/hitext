import { deepStrictEqual, strictEqual } from 'assert';
import { rangeMatch, rangeCollapseTo, generateRanges } from '../src/index.js';
import { startEndData } from './utils.js';

// Helper to extract just [start, end] without data
function startEnd(ranges: Array<{ start: number; end: number }>): Array<[number, number]> {
    return ranges.map(r => [r.start, r.end]);
}

describe('rangeCollapseTo', () => {
    describe('Collapse to start', () => {
        it('should collapse range to start position', () => {
            const source = 'hello world';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[6, 11]], 'start') // "world"
            );

            deepStrictEqual(startEnd(ranges), [[6, 6]]);
        });

        it('should collapse multiple ranges to their start positions', () => {
            const source = 'one two three';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[0, 3], [4, 7], [8, 13]], 'start')
            );

            // All collapsed to zero-width at their start
            deepStrictEqual(startEnd(ranges), [
                [0, 0],
                [4, 4],
                [8, 8]
            ]);
        });

        it('should preserve data when collapsing', () => {
            const source = 'hello world';
            const input = [{ start: 6, end: 11, data: { type: 'word' } }];
            const ranges = generateRanges(source, rangeCollapseTo(input, 'start'));

            deepStrictEqual(startEndData(ranges), [
                [6, 6, { type: 'word' }]
            ]);
        });
    });

    describe('Collapse to end', () => {
        it('should collapse range to end position', () => {
            const source = 'hello world';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[0, 5]], 'end') // "hello"
            );

            deepStrictEqual(startEnd(ranges), [[5, 5]]);
        });

        it('should collapse multiple ranges to their end positions', () => {
            const source = 'one two three';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[0, 3], [4, 7], [8, 13]], 'end')
            );

            deepStrictEqual(startEnd(ranges), [
                [3, 3],
                [7, 7],
                [13, 13]
            ]);
        });
    });

    describe('Collapse to lineStart', () => {
        it('should collapse to start of line containing range start', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[9, 11]], 'lineStart') // "ne" from "line2"
            );

            // Should collapse to start of line2 (offset 6)
            deepStrictEqual(startEnd(ranges), [[6, 6]]);
        });

        it('should collapse to line start for multiple ranges', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[2, 4], [8, 10]], 'lineStart') // chars in line1 and line2
            );

            // First to start of line1 (0), second to start of line2 (6)
            deepStrictEqual(startEnd(ranges), [
                [0, 0],
                [6, 6]
            ]);
        });

        it('should handle multiline range - uses start line', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[2, 10]], 'lineStart') // spans from line1 to line2
            );

            // Should use line containing start (line1), so collapse to offset 0
            deepStrictEqual(startEnd(ranges), [[0, 0]]);
        });

        it('should handle range at start of line', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[6, 11]], 'lineStart') // entire "line2"
            );

            // Already at line start
            deepStrictEqual(startEnd(ranges), [[6, 6]]);
        });
    });

    describe('Collapse to lineContentEnd', () => {
        it('should collapse to end of line content (before newline)', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[8, 10]], 'lineContentEnd'));

            // "ne" from "line2" -> collapse to end of "line2" content (offset 11, before \n)
            deepStrictEqual(startEnd(ranges), [[11, 11]]);
            strictEqual(source[11], '\n'); // Position is before newline
        });

        it('should handle line without trailing newline', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[14, 16]], 'lineContentEnd'));

            // "ne" from "line3" -> collapse to end of "line3" content (offset 17, no newline)
            deepStrictEqual(startEnd(ranges), [[17, 17]]);
        });

        it('should handle multiline range - uses end line', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[2, 10]], 'lineContentEnd'));

            // Spans line1-line2, should use end line (line2)
            // Collapse to end of line2 content (offset 11)
            deepStrictEqual(startEnd(ranges), [[11, 11]]);
        });
    });

    describe('Collapse to lineEnd', () => {
        it('should collapse to end of line (after newline)', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[8, 10]], 'lineEnd'));

            // "ne" from "line2" -> collapse to after \n (offset 12, start of next line)
            deepStrictEqual(startEnd(ranges), [[12, 12]]);
            strictEqual(source[12], 'l'); // Start of "line3"
        });

        it('should handle line without trailing newline', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[14, 16]], 'lineEnd'));

            // "ne" from "line3" -> collapse to end (offset 17, no newline to go after)
            deepStrictEqual(startEnd(ranges), [[17, 17]]);
        });

        it('should handle multiline range - uses end line', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[2, 10]], 'lineEnd'));

            // Spans line1-line2, should use end line (line2)
            // Collapse to after line2's \n (offset 12)
            deepStrictEqual(startEnd(ranges), [[12, 12]]);
        });
    });

    describe('Different line endings', () => {
        it('should work with \\n line endings', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[7, 9]], 'lineContentEnd'));

            deepStrictEqual(startEnd(ranges), [[11, 11]]);
        });

        it('should work with \\r line endings', () => {
            const source = 'line1\rline2\rline3';
            const ranges = generateRanges(source, rangeCollapseTo([[7, 9]], 'lineContentEnd'));

            // "in" from "line2" -> collapse to end of line2 content (offset 11, before \r)
            deepStrictEqual(startEnd(ranges), [[11, 11]]);
            strictEqual(source[11], '\r');
        });

        it('should work with \\r\\n line endings', () => {
            const source = 'line1\r\nline2\r\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[8, 10]], 'lineContentEnd'));

            // "in" from "line2" -> collapse to end of line2 content (offset 12, before \r\n)
            deepStrictEqual(startEnd(ranges), [[12, 12]]);
            strictEqual(source.slice(12, 14), '\r\n');
        });

        it('should work with mixed line endings', () => {
            const source = 'line1\nline2\r\nline3\rline4';
            const ranges = generateRanges(source, rangeCollapseTo([[8, 10]], 'lineEnd'));

            // Position 8-10 is in line2 (CRLF ending)
            // Collapse to after \r\n (offset 13, start of line3)
            deepStrictEqual(startEnd(ranges), [[13, 13]]);
        });

        it('should handle CRLF with lineEnd', () => {
            const source = 'line1\r\nline2\r\nline3';
            const ranges = generateRanges(source, rangeCollapseTo([[9, 11]], 'lineEnd'));

            // "ne" from "line2" -> collapse to after \r\n (offset 14, start of line3)
            deepStrictEqual(startEnd(ranges), [[14, 14]]);
            strictEqual(source[14], 'l'); // Start of "line3"
        });

        it('should handle CR with lineEnd', () => {
            const source = 'line1\rline2\rline3';
            const ranges = generateRanges(source, rangeCollapseTo([[8, 10]], 'lineEnd'));

            // "ne" from "line2" -> collapse to after \r (offset 12, start of line3)
            deepStrictEqual(startEnd(ranges), [[12, 12]]);
            strictEqual(source[12], 'l'); // Start of "line3"
        });
    });

    describe('Metadata preservation', () => {
        it('should preserve existing data when collapsing', () => {
            const source = 'hello world';
            const ranges = generateRanges(source, rangeCollapseTo([[6, 11]], 'start'));

            deepStrictEqual(startEndData(ranges), [
                [6, 6, undefined]
            ]);
        });

        it('should preserve existing data along with origin', () => {
            const source = 'hello world';
            const input = [{ start: 6, end: 11, data: { word: 'world', length: 5 } }];
            const ranges = generateRanges(source, rangeCollapseTo(input, 'end'));

            deepStrictEqual(startEndData(ranges), [
                [11, 11, { word: 'world', length: 5 }]
            ]);
        });

        it('should work with ranges without initial data', () => {
            const source = 'hello world';
            const ranges = generateRanges(source, rangeCollapseTo([[0, 5]], 'lineStart'));

            deepStrictEqual(startEndData(ranges), [
                [0, 0, undefined]
            ]);
        });
    });

    describe('Zero-width ranges', () => {
        it('should handle zero-width range at start', () => {
            const source = 'hello world';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[5, 5]], 'start')
            );

            deepStrictEqual(startEnd(ranges), [[5, 5]]);
        });

        it('should handle zero-width range with lineContentEnd', () => {
            const source = 'line1\nline2';
            const ranges = generateRanges(source, rangeCollapseTo([[5, 5]], 'lineContentEnd'));

            // Zero-width at end of line1, should collapse to end of line1 content
            deepStrictEqual(startEnd(ranges), [[5, 5]]);
        });
    });

    describe('Edge cases', () => {
        it('should handle range at start of source', () => {
            const source = 'hello world';
            const ranges = generateRanges(source, rangeCollapseTo([[0, 5]], 'lineStart'));

            deepStrictEqual(startEnd(ranges), [[0, 0]]);
        });

        it('should handle range at end of source', () => {
            const source = 'hello world';
            const ranges = generateRanges(source, rangeCollapseTo([[6, 11]], 'lineEnd'));

            // No newline at end, should be at offset 11
            deepStrictEqual(startEnd(ranges), [[11, 11]]);
        });

        it('should handle empty source', () => {
            const source = '';
            const ranges = generateRanges(source, rangeCollapseTo([[0, 0]], 'start'));

            deepStrictEqual(startEnd(ranges), [[0, 0]]);
        });

        it('should handle single character source', () => {
            const source = 'x';
            const ranges = generateRanges(source, rangeCollapseTo([[0, 1]], 'lineContentEnd'));

            deepStrictEqual(startEnd(ranges), [[1, 1]]);
        });
    });

    describe('Integration with rangeMatch', () => {
        it('should collapse matched ranges to start', () => {
            const source = 'hello world hello universe';
            const ranges = generateRanges(
                source,
                rangeCollapseTo(rangeMatch(/hello/g), 'start')
            );

            // Two matches, both collapsed to zero-width at match start positions
            deepStrictEqual(startEnd(ranges), [
                [0, 0],   // First "hello" at offset 0
                [12, 12]  // Second "hello" at offset 12
            ]);
        });

        it('should collapse matches to line ends for markers', () => {
            const source = 'error here\nwarning there\nok';
            const ranges = generateRanges(
                source,
                rangeCollapseTo(rangeMatch(/error|warning/g), 'lineContentEnd')
            );

            // Two matches on lines 0 and 1, both collapsed to zero-width at end of their lines
            deepStrictEqual(startEnd(ranges), [
                [10, 10],  // End of "error here" line
                [24, 24]   // End of "warning there" line
            ]);
        });
    });

    describe('Origin tracking', () => {
        it('should create origin when input has no origin', () => {
            const source = 'hello world';
            const ranges = generateRanges(
                source,
                rangeCollapseTo([[6, 11]], 'start')
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, { start: 6, end: 11, data: undefined });
            strictEqual(ranges[0].start, 6);
            strictEqual(ranges[0].end, 6);
        });

        it('should preserve origin when input already has origin', () => {
            const source = 'hello world';
            const inputWithOrigin = [{ start: 6, end: 11, data: 'test', origin: { start: 0, end: 5, data: 'original' } }];
            const ranges = generateRanges(
                source,
                rangeCollapseTo(inputWithOrigin, 'end')
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, { start: 0, end: 5, data: 'original' });
            strictEqual(ranges[0].start, 11);
            strictEqual(ranges[0].end, 11);
        });
    });
});

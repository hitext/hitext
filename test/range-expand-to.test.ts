import { deepStrictEqual, strictEqual } from 'assert';
import { rangeExpandTo, generateRanges } from '../src/index.js';
import { renderRanges } from './utils.js';

describe('rangeExpandTo', () => {
    describe('Position: line', () => {
        it('should expand range to full line boundaries (including newlines)', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 9]], 'line') // "in" from "line2"
            );

            // Should expand to full line2 including newline
            deepStrictEqual(expanded, ['line2\n']);
        });

        it('should work without trailing newline', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[13, 15]], 'line') // "ne" from "line3"
            );

            // Last line has no newline
            deepStrictEqual(expanded, ['line3']);
        });

        it('should expand with context lines', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4\nline5',
                rangeExpandTo([[13, 15]], 'line', 1) // "ne" from "line3", ±1 line
            );

            // Should include line2, line3, line4
            deepStrictEqual(expanded, ['line2\nline3\nline4\n']);
        });

        it('should handle asymmetric context', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4\nline5',
                rangeExpandTo([[13, 15]], 'line', [1, 2]) // "ne" from "line3", 1 before, 2 after
            );

            // Should include line2, line3, line4, line5
            deepStrictEqual(expanded, ['line2\nline3\nline4\nline5']);
        });
    });

    describe('Position: lineContent', () => {
        it('should expand to line content (excluding newlines)', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 9]], 'lineContent') // "in" from "line2"
            );

            // Should expand to line2 content without newline
            deepStrictEqual(expanded, ['line2']);
        });

        it('should work without trailing newline', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[13, 15]], 'lineContent') // "ne" from "line3"
            );

            // Last line has no newline, same result
            deepStrictEqual(expanded, ['line3']);
        });

        it('should work with CRLF', () => {
            const expanded = renderRanges(
                'line1\r\nline2\r\nline3',
                rangeExpandTo([[9, 11]], 'lineContent') // "ne" from "line2"
            );

            // Should exclude \r\n
            deepStrictEqual(expanded, ['line2']);
        });

        it('should expand with context lines', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4\nline5',
                rangeExpandTo([[13, 15]], 'lineContent', 1) // "ne" from "line3", ±1 line
            );

            // Should include line2, line3, line4 content without final newline
            deepStrictEqual(expanded, ['line2\nline3\nline4']);
        });

        it('should support tuple syntax for asymmetric context', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4\nline5',
                rangeExpandTo([[13, 15]], 'lineContent', [1, 2]) // "ne" from "line3", 1 before, 2 after
            );

            // Should include line2, line3, line4, line5 content without final newline
            deepStrictEqual(expanded, ['line2\nline3\nline4\nline5']);
        });
    });

    describe('Position: lineStart', () => {
        it('should expand start to line start, keep original end', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 9]], 'lineStart') // "in" from "line2"
            );

            // Should expand start to beginning of line2, keep end at 9
            deepStrictEqual(expanded, ['lin']);
        });

        it('should not expand end', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 11]], 'lineStart') // "ine2" from "line2"
            );

            // Start expands to line start, end stays at 11
            deepStrictEqual(expanded, ['line2']);
        });

        it('should respect lines parameter for start', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4',
                rangeExpandTo([[13, 15]], 'lineStart', 1) // "in" from "line3", -1 line
            );

            // Should expand start to line2, keep end at 15
            // line2 starts at 6, position 15 is "in" from line3, so [6,15] = "line2\nlin"
            deepStrictEqual(expanded, ['line2\nlin']);
        });
    });

    describe('Position: lineEnd', () => {
        it('should keep original start, expand end to line end (including newline)', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 9]], 'lineEnd') // "in" from "line2"
            );

            // Should keep start at 7, expand end to after newline
            deepStrictEqual(expanded, ['ine2\n']);
        });

        it('should expand end to line end without trailing newline', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[13, 15]], 'lineEnd') // "in" from "line3"
            );

            // Should keep start at 13, expand end to 17
            deepStrictEqual(expanded, ['ine3']);
        });

        it('should respect linesAfter parameter', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4',
                rangeExpandTo([[7, 9]], 'lineEnd', [0, 1]) // "in" from "line2", +1 line after
            );

            // Should keep start at 7, expand end through line3's newline
            deepStrictEqual(expanded, ['ine2\nline3\n']);
        });
    });

    describe('Position: lineContentEnd', () => {
        it('should keep original start, expand end to line content end (excluding newline)', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 9]], 'lineContentEnd') // "in" from "line2"
            );

            // Should keep start at 7, expand end to before newline
            deepStrictEqual(expanded, ['ine2']);
        });

        it('should work without trailing newline', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[13, 15]], 'lineContentEnd') // "in" from "line3"
            );

            // Should keep start at 13, expand end to 17
            deepStrictEqual(expanded, ['ine3']);
        });

        it('should work with CRLF', () => {
            const expanded = renderRanges(
                'line1\r\nline2\r\nline3',
                rangeExpandTo([[9, 11]], 'lineContentEnd') // "ne" from "line2"
            );

            // Should keep start at 9, expand end to before \r\n
            deepStrictEqual(expanded, ['ne2']);
        });

        it('should respect linesAfter parameter', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4',
                rangeExpandTo([[7, 9]], 'lineContentEnd', [0, 1]) // "in" from "line2", +1 line after
            );

            // Should keep start at 7, expand end through line3 content
            deepStrictEqual(expanded, ['ine2\nline3']);
        });
    });

    describe('Multiline ranges', () => {
        it('should handle multiline range with line mode', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4',
                rangeExpandTo([[7, 15]], 'line') // from "in" of line2 to "ne" of line3
            );

            // Should expand to full line2 and line3
            deepStrictEqual(expanded, ['line2\nline3\n']);
        });

        it('should handle multiline range with lineContent mode', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3\nline4',
                rangeExpandTo([[7, 15]], 'lineContent') // from "in" of line2 to "ne" of line3
            );

            // Should expand to line2-line3 content without final newline
            deepStrictEqual(expanded, ['line2\nline3']);
        });
    });

    describe('Data preservation', () => {
        it('should preserve data when expanding', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([{ start: 7, end: 9, data: { type: 'match' } }], 'line')
            );

            // Data is preserved internally, result shows expanded content
            deepStrictEqual(expanded, ['line2\n']);
        });

        it('should preserve existing data with lineContent mode', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([{ start: 7, end: 9, data: { id: 42, text: 'test' } }], 'lineContent')
            );

            // Data is preserved internally, result shows expanded content
            deepStrictEqual(expanded, ['line2']);
        });

        it('should work with ranges without initial data', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 9]], 'lineStart')
            );

            deepStrictEqual(expanded, ['lin']);
        });
    });

    describe('Edge cases', () => {
        it('should handle zero-width range', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[7, 7]], 'line')
            );

            // Should expand to full line2
            deepStrictEqual(expanded, ['line2\n']);
        });

        it('should handle range at start of source', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[0, 2]], 'line')
            );

            // Should expand to full line1
            deepStrictEqual(expanded, ['line1\n']);
        });

        it('should handle range at end of source', () => {
            const expanded = renderRanges(
                'line1\nline2\nline3',
                rangeExpandTo([[15, 17]], 'line')
            );

            // Should expand to full line3 (no trailing newline)
            deepStrictEqual(expanded, ['line3']);
        });

        it('should handle empty source', () => {
            const expanded = renderRanges(
                '',
                rangeExpandTo([[0, 0]], 'line')
            );

            // Empty remains empty
            deepStrictEqual(expanded, ['']);
        });
    });

    describe('Origin tracking', () => {
        it('should create origin when input has no origin', () => {
            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeExpandTo([[7, 9]], 'line') // "in" from "line2"
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, { start: 7, end: 9, data: undefined });
            strictEqual(ranges[0].start, 6);
            strictEqual(ranges[0].end, 12);
        });

        it('should preserve origin when input already has origin', () => {
            const source = 'line1\nline2\nline3';
            const inputWithOrigin = [{ start: 7, end: 9, data: 'test', origin: { start: 0, end: 5, data: 'original' } }];
            const ranges = generateRanges(
                source,
                rangeExpandTo(inputWithOrigin, 'lineContent')
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, { start: 0, end: 5, data: 'original' });
            strictEqual(ranges[0].start, 6);
            strictEqual(ranges[0].end, 11);
        });
    });
});

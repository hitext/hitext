import { deepStrictEqual } from 'assert';
import { rangeMatch, rangeExpandToLines } from '../src/index.js';
import { renderRanges } from './utils.js';

describe('rangeExpandToLines', () => {
    describe('Basic line expansion', () => {
        it('should expand range to its line boundaries (no context)', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[7, 9]]) // "in" from "line2"
            );

            // Should expand to full line2 including newline
            deepStrictEqual(lines, ['line2\n']);
        });

        it('should expand range to line boundaries without trailing newline at end', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeExpandToLines([[13, 15]]) // "ne" from "line3"
            );

            // Last line has no newline
            deepStrictEqual(lines, ['line3']);
        });

        it('should expand multiple ranges on different lines', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[1, 2], [7, 8]]) // chars in line1 and line2
            );

            // Each range expands to its line (1-to-1, no merging)
            deepStrictEqual(lines, [
                'line1\n',
                'line2\n'
            ]);
        });

        it('should handle range spanning multiple lines', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[1, 14]]) // spans line1-3
            );

            // Should expand to include all three lines
            deepStrictEqual(lines, [
                'line1\n' +
                'line2\n' +
                'line3\n'
            ]);
        });
    });

    describe('Context lines', () => {
        it('should expand with 1 line of context above and below', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[7, 9]], 1) // "in" from "line2"
            );

            // Should include line1, line2, line3
            deepStrictEqual(lines, [
                'line1\n' +
                'line2\n' +
                'line3\n'
            ]);
        });

        it('should expand with 2 lines of context', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[13, 15]], 2) // "ne" from "line3"
            );

            // Should include all 5 lines (line3 ± 2)
            deepStrictEqual(lines, [
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5'
            ]);
        });

        it('should not go beyond document start', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[0, 2]], 2) // first line with 2 lines context
            );

            // Can't go before start, should include lines 1-3
            deepStrictEqual(lines, [
                'line1\n' +
                'line2\n' +
                'line3\n'
            ]);
        });

        it('should not go beyond document end', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[27, 29]], 2) // last line with 2 lines context
            );

            // Can't go past end, should include lines 3-5
            deepStrictEqual(lines, [
                'line3\n' +
                'line4\n' +
                'line5'
            ]);
        });

        it('should merge when context causes overlap', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines([[1, 2], [13, 14]], 1) // line1 and line3, each with 1 line context
            );

            // line1±1 = lines 1-2, line3±1 = lines 2-4 (overlap but no merge in 1-to-1)
            deepStrictEqual(lines, [
                'line1\nline2\n',
                'line2\nline3\nline4\n'
            ]);
        });

        it('should support different lines before and after', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5\n' +
                'line6',
                rangeExpandToLines([[13, 14]], 1, 2) // line3 with 1 line before, 2 lines after
            );

            // line3 with 1 before (line2) and 2 after (line4, line5)
            deepStrictEqual(lines, [
                'line2\nline3\nline4\nline5\n'
            ]);
        });

        it('should handle non-overlapping ranges with context', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5\n' +
                'line6\n' +
                'line7',
                rangeExpandToLines([[1, 2], [25, 26]], 0) // line1 and line5, no context
            );

            // Separate ranges, not adjacent
            deepStrictEqual(lines, ['line1\n', 'line5\n']);
        });
    });

    describe('Different line endings', () => {
        it('should work with \\n line endings', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeExpandToLines([[7, 9]], 0)
            );

            deepStrictEqual(lines, ['line2\n']);
        });

        it('should work with \\r line endings', () => {
            const lines = renderRanges(
                'line1\r' +
                'line2\r' +
                'line3',
                rangeExpandToLines([[7, 9]], 0)
            );

            deepStrictEqual(lines, ['line2\r']);
        });

        it('should work with \\r\\n line endings', () => {
            const lines = renderRanges(
                'line1\r\n' +
                'line2\r\n' +
                'line3',
                rangeExpandToLines([[8, 10]], 0)
            );

            deepStrictEqual(lines, ['line2\r\n']);
        });

        it('should work with mixed line endings', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\r\n' +
                'line3\r' +
                'line4',
                rangeExpandToLines([[8, 10]], 0)
            );

            // Position 8-10 is in line2
            deepStrictEqual(lines, ['line2\r\n']);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty ranges', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeExpandToLines([])
            );

            deepStrictEqual(lines, []);
        });

        it('should handle single line source', () => {
            const lines = renderRanges(
                'single line',
                rangeExpandToLines([[0, 6]])
            );

            deepStrictEqual(lines, ['single line']);
        });

        it('should handle range at exact line boundary', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeExpandToLines([[5, 6]]) // the newline itself
            );

            // Should expand to line1
            deepStrictEqual(lines, ['line1\n']);
        });

        it('should handle empty lines', () => {
            const lines = renderRanges(
                'line1\n' +
                '\n' +
                'line3',
                rangeExpandToLines([[6, 7]], 0) // char in empty line
            );

            // Empty line2 with its newline
            deepStrictEqual(lines, ['\n']);
        });

        it('should handle match that is entire line', () => {
            const lines = renderRanges(
                'line1\n' +
                'MATCH\n' +
                'line3',
                rangeExpandToLines([[6, 11]], 0)
            );

            deepStrictEqual(lines, ['MATCH\n']);
        });
    });

    describe('Integration with rangeMatch', () => {
        it('should expand regex matches to full lines', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines(rangeMatch(/line2/g), 0)
            );

            deepStrictEqual(lines, ['line2\n']);
        });

        it('should expand multiple matches with context', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5',
                rangeExpandToLines(rangeMatch(/line[24]/g), 1)
            );

            // line2 and line4, each with 1 line context
            // line2±1 = lines 1-3, line4±1 = lines 3-5 (overlap but no merge)
            deepStrictEqual(lines, [
                'line1\nline2\nline3\n',
                'line3\nline4\nline5'
            ]);
        });

        it('should work with non-overlapping matches', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5\n' +
                'line6\n' +
                'line7',
                rangeExpandToLines(rangeMatch(/line[17]/g), 0)
            );

            // line1 and line7, no overlap
            deepStrictEqual(lines, ['line1\n', 'line7']);
        });
    });

    describe('Viewport scenarios', () => {
        it('should create viewport showing only matching lines', () => {
            const lines = renderRanges(
                'a\n' +
                'b\n' +
                'c\n' +
                'd\n' +
                'e\n' +
                'f\n' +
                'g\n' +
                'h',
                rangeExpandToLines(rangeMatch(/[cf]/g), 0)
            );

            // Show only lines with 'c' and 'f'
            deepStrictEqual(lines, ['c\n', 'f\n']);
        });

        it('should create viewport with context lines', () => {
            const lines = renderRanges(
                'a\n' +
                'b\n' +
                'c\n' +
                'd\n' +
                'e\n' +
                'f\n' +
                'g\n' +
                'h',
                rangeExpandToLines(rangeMatch(/[cf]/g), 1)
            );

            // 'c' is line3, with context = lines 2-4 (b, c, d)
            // 'f' is line6, with context = lines 5-7 (e, f, g) - overlap but no merge
            deepStrictEqual(lines, [
                'b\nc\nd\n',
                'e\nf\ng\n'
            ]);
        });

        it('should show grep-like output with matches and context', () => {
            const lines = renderRanges(
                'function foo() {\n' +
                '  return 42;\n' +
                '}\n' +
                '\n' +
                'function bar() {\n' +
                '  return 99;\n' +
                '}',
                rangeExpandToLines(rangeMatch(/return/g), 1)
            );

            // Two 'return' statements, each with 1 line context
            deepStrictEqual(lines, [
                'function foo() {\n' +
                '  return 42;\n' +
                '}\n',
                'function bar() {\n' +
                '  return 99;\n' +
                '}'
            ]);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple ranges on same line', () => {
            const lines = renderRanges(
                'ERROR and WARNING on same line\n' +
                'line2',
                rangeExpandToLines(rangeMatch(/ERROR|WARNING/g), 0)
            );

            // Both matches on same line, each creates a range to the same line (duplicates)
            deepStrictEqual(lines, [
                'ERROR and WARNING on same line\n',
                'ERROR and WARNING on same line\n'
            ]);
        });

        it('should handle ranges in source with no trailing newline', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeExpandToLines(rangeMatch(/line[123]/g), 0)
            );

            // Three separate line ranges (1-to-1, no merging)
            deepStrictEqual(lines, [
                'line1\n',
                'line2\n',
                'line3'
            ]);
        });

        it('should handle context that spans entire document', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5\n' +
                'line6\n' +
                'line7\n' +
                'line8\n' +
                'line9\n' +
                'line10',
                rangeExpandToLines([[31, 35]], 20) // 'line6' with huge context (20 lines)
            );

            // Context is clamped to document boundaries (can't go beyond line 1 or line 10)
            deepStrictEqual(lines, [
                'line1\n' +
                'line2\n' +
                'line3\n' +
                'line4\n' +
                'line5\n' +
                'line6\n' +
                'line7\n' +
                'line8\n' +
                'line9\n' +
                'line10'
            ]);
        });

        it('should handle adjacent lines with no context', () => {
            const lines = renderRanges(
                'line1\n' +
                'line2\n' +
                'line3',
                rangeExpandToLines([[0, 1], [6, 7]], 0) // chars in line1 and line2
            );

            // line1 and line2 are adjacent, but output separately (1-to-1)
            deepStrictEqual(lines, [
                'line1\n',
                'line2\n'
            ]);
        });
    });
});

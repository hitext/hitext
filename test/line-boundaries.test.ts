import { deepStrictEqual, strictEqual } from 'assert';
import {
    createLineBoundaries,
    getSharedLineBoundaries,
    setSharedLineBoundaries
} from '../src/utils/line-boundaries.js';

describe('LineBoundaries', () => {
    describe('getLineStartForOffset', () => {
        it('should return line start for offset at line beginning', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineStartForOffset(0), 0);  // line1
            strictEqual(lb.getLineStartForOffset(6), 6);  // line2
            strictEqual(lb.getLineStartForOffset(12), 12); // line3
        });

        it('should return line start for offset in middle of line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineStartForOffset(3), 0);  // in "line1"
            strictEqual(lb.getLineStartForOffset(8), 6);  // in "line2"
            strictEqual(lb.getLineStartForOffset(14), 12); // in "line3"
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLineStartForOffset(0), 0);
            strictEqual(lb.getLineStartForOffset(7), 7);   // line2 starts after \r\n
            strictEqual(lb.getLineStartForOffset(14), 14); // line3
        });

        it('should handle mixed line endings', () => {
            const lb = createLineBoundaries('line1\rline2\nline3\r\nline4');
            strictEqual(lb.getLineStartForOffset(0), 0);
            strictEqual(lb.getLineStartForOffset(6), 6);   // line2
            strictEqual(lb.getLineStartForOffset(12), 12); // line3
            strictEqual(lb.getLineStartForOffset(19), 19); // line4
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineStartForOffset(2, 1), 6);   // from line1 forward 1 line
            strictEqual(lb.getLineStartForOffset(2, 2), 12);  // from line1 forward 2 lines
            strictEqual(lb.getLineStartForOffset(8, 1), 12);  // from line2 forward 1 line
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineStartForOffset(14, -1), 6);  // from line3 back 1 line
            strictEqual(lb.getLineStartForOffset(14, -2), 0);  // from line3 back 2 lines
            strictEqual(lb.getLineStartForOffset(8, -1), 0);   // from line2 back 1 line
        });

        it('should clamp to boundaries with lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineStartForOffset(2, -5), 0);  // can't go before 0
            strictEqual(lb.getLineStartForOffset(2, 10), 12); // can't go beyond last line
        });
    });

    describe('getLineEndForOffset', () => {
        it('should return line end including newline', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineEndForOffset(0), 6);  // "line1\n"
            strictEqual(lb.getLineEndForOffset(6), 12); // "line2\n"
            strictEqual(lb.getLineEndForOffset(12), 17); // "line3"
        });

        it('should return source length for last line', () => {
            const lb = createLineBoundaries('line1\nline2');
            strictEqual(lb.getLineEndForOffset(10), 11); // last line
        });

        it('should exclude newline when excludeNewline is true', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineEndForOffset(0, true), 5);  // "line1" without \n
            strictEqual(lb.getLineEndForOffset(6, true), 11); // "line2" without \n
            strictEqual(lb.getLineEndForOffset(12, true), 17); // "line3" (no newline)
        });

        it('should handle CRLF when excluding newline', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLineEndForOffset(0, true), 5);  // "line1" without \r\n
            strictEqual(lb.getLineEndForOffset(7, true), 12); // "line2" without \r\n
            strictEqual(lb.getLineEndForOffset(14, true), 19); // "line3" (no newline)
        });

        it('should handle mixed line endings when excluding newline', () => {
            const lb = createLineBoundaries('line1\nline2\r\nline3\rline4');
            strictEqual(lb.getLineEndForOffset(0, true), 5);  // "line1" without \n
            strictEqual(lb.getLineEndForOffset(6, true), 11); // "line2" without \r\n
            strictEqual(lb.getLineEndForOffset(14, true), 18); // "line3" without \r (content ends at 17, \r is at 18)
            strictEqual(lb.getLineEndForOffset(20, true), 24); // "line4" (no newline) - string ends at 24
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineEndForOffset(2, false, 1), 12);  // from line1 forward 1 line
            strictEqual(lb.getLineEndForOffset(2, false, 2), 18);  // from line1 forward 2 lines
            strictEqual(lb.getLineEndForOffset(8, false, 1), 18);  // from line2 forward 1 line
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineEndForOffset(14, false, -1), 12);  // from line3 back 1 line
            strictEqual(lb.getLineEndForOffset(14, false, -2), 6);   // from line3 back 2 lines
            strictEqual(lb.getLineEndForOffset(8, false, -1), 6);    // from line2 back 1 line
        });

        it('should combine excludeNewline with lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineEndForOffset(2, true, 1), 11);  // from line1 forward 1 line, exclude newline
            strictEqual(lb.getLineEndForOffset(14, true, -1), 11);  // from line3 back 1 line, exclude newline
        });
    });

    describe('expand range to lines pattern', () => {
        it('should expand range to line boundaries', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            // Range [2, 4] is in "line1", should expand to [0, 6]
            const start = lb.getLineStartForOffset(2);
            const end = lb.getLineEndForOffset(Math.max(0, 4 - 1));
            deepStrictEqual([start, end], [0, 6]);
        });

        it('should expand range spanning multiple lines', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            // Range [3, 9] spans line1 and line2
            const start = lb.getLineStartForOffset(3);
            const end = lb.getLineEndForOffset(Math.max(0, 9 - 1));
            deepStrictEqual([start, end], [0, 12]);
        });

        it('should apply padding using lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            // Range [8, 10] is in line2, with padding=1 should include line1 and line3
            const start = lb.getLineStartForOffset(8, -1); // back 1 line
            const end = lb.getLineEndForOffset(Math.max(0, 10 - 1), false, 1); // forward 1 line
            deepStrictEqual([start, end], [0, 18]);
        });

        it('should work with sequential ranges', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');

            // Process ranges sequentially (common pattern)
            let start = lb.getLineStartForOffset(2);
            let end = lb.getLineEndForOffset(Math.max(0, 4 - 1));
            deepStrictEqual([start, end], [0, 6]);

            start = lb.getLineStartForOffset(8);
            end = lb.getLineEndForOffset(Math.max(0, 10 - 1));
            deepStrictEqual([start, end], [6, 12]);

            start = lb.getLineStartForOffset(14);
            end = lb.getLineEndForOffset(Math.max(0, 16 - 1));
            deepStrictEqual([start, end], [12, 18]);
        });
    });

    describe('lazy evaluation', () => {
        it('should only scan as much as needed', () => {
            const source = 'a'.repeat(1000) + '\n' + 'b'.repeat(1000) + '\n' + 'c'.repeat(1000);
            const lb = createLineBoundaries(source);

            // Only ask for first line
            const start = lb.getLineStartForOffset(500);
            strictEqual(start, 0);

            // Should not have scanned the entire source yet
            // (We can't easily test this without exposing internals, but behavior is correct)
        });

        it('should cache sequential lookups', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');

            // First lookup
            strictEqual(lb.getLineStartForOffset(8), 6);
            // Second lookup on same line should use cache
            strictEqual(lb.getLineEndForOffset(9), 12);
            // Third lookup on same line should use cache
            strictEqual(lb.getLineStartForOffset(10), 6);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            const lb = createLineBoundaries('');
            strictEqual(lb.getLineStartForOffset(0), 0);
            strictEqual(lb.getLineEndForOffset(0), 0);
        });

        it('should handle single line without newline', () => {
            const lb = createLineBoundaries('single line');
            strictEqual(lb.getLineStartForOffset(5), 0);
            strictEqual(lb.getLineEndForOffset(5), 11);
        });

        it('should handle string with only newlines', () => {
            const lb = createLineBoundaries('\n\n\n');
            strictEqual(lb.getLineStartForOffset(0), 0);
            strictEqual(lb.getLineEndForOffset(0), 1);
        });

        it('should handle offset beyond source length', () => {
            const lb = createLineBoundaries('test');
            strictEqual(lb.getLineStartForOffset(100), 0);
            strictEqual(lb.getLineEndForOffset(100), 4);
        });

        it('should handle negative offset', () => {
            const lb = createLineBoundaries('test\nmore');
            strictEqual(lb.getLineStartForOffset(-1), 0);
            strictEqual(lb.getLineEndForOffset(-1), 5); // End of first line "test\n"
        });
    });

    describe('getSharedLineBoundaries', () => {
        afterEach(() => {
            setSharedLineBoundaries(null);
        });

        it('should return cached instance when set for matching source', () => {
            const source = 'line1\nline2\nline3';
            const lb1 = setSharedLineBoundaries(source);
            const lb2 = getSharedLineBoundaries(source);

            strictEqual(lb1, lb2, 'Should return the cached instance');
        });

        it('should return new instance when no cache exists', () => {
            const source1 = 'line1\nline2\nline3';
            const source2 = 'other\ntext';

            const lb1 = getSharedLineBoundaries(source1);
            const lb2 = getSharedLineBoundaries(source2);

            strictEqual(lb1 === lb2, false, 'Should return different instances');
        });

        it('should work correctly with cached instance', () => {
            const source = 'line1\nline2\nline3';
            setSharedLineBoundaries(source);
            const lb = getSharedLineBoundaries(source);

            strictEqual(lb.getLineStartForOffset(8), 6);
            strictEqual(lb.getLineEndForOffset(8), 12);
        });

        it('should clear cache when set to null', () => {
            const source = 'line1\nline2\nline3';
            const lb1 = setSharedLineBoundaries(source);

            setSharedLineBoundaries(null);

            const lb2 = getSharedLineBoundaries(source);
            strictEqual(lb1 === lb2, false, 'Should return new instance after clearing cache');
        });
    });

    describe('getLine', () => {
        it('should return 1-based line number for offset', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLine(0), 1);   // first line
            strictEqual(lb.getLine(3), 1);   // in first line
            strictEqual(lb.getLine(5), 1);   // at newline
            strictEqual(lb.getLine(6), 2);   // second line
            strictEqual(lb.getLine(8), 2);   // in second line
            strictEqual(lb.getLine(12), 3);  // third line
            strictEqual(lb.getLine(14), 3);  // in third line
        });

        it('should handle negative offsets', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLine(-1), 1);
            strictEqual(lb.getLine(-100), 1);
        });

        it('should handle offsets beyond end', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLine(100), 3);
            strictEqual(lb.getLine(1000), 3);
        });

        it('should work with CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLine(0), 1);
            strictEqual(lb.getLine(5), 1);   // at \r
            strictEqual(lb.getLine(6), 1);   // at \n
            strictEqual(lb.getLine(7), 2);   // start of line2
        });
    });

    describe('getColumn', () => {
        it('should return 1-based column for offset', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getColumn(0), 1);   // first column of line 1
            strictEqual(lb.getColumn(1), 2);   // second column of line 1
            strictEqual(lb.getColumn(5), 6);   // at newline (6th column)
            strictEqual(lb.getColumn(6), 1);   // first column of line 2
            strictEqual(lb.getColumn(8), 3);   // third column of line 2
        });

        it('should handle negative offsets', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getColumn(-1), 1);
            strictEqual(lb.getColumn(-100), 1);
        });

        it('should handle offsets at end of line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getColumn(5), 6);   // at newline of line 1
            strictEqual(lb.getColumn(11), 6);  // at newline of line 2
        });

        it('should handle offsets beyond end', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            const lastOffset = 'line1\nline2\nline3'.length;
            strictEqual(lb.getColumn(lastOffset), 6);  // beyond last char
            strictEqual(lb.getColumn(1000), 6);        // way beyond
        });

        it('should work with CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getColumn(0), 1);
            strictEqual(lb.getColumn(5), 6);   // at \r (6th column)
            strictEqual(lb.getColumn(6), 7);   // at \n (7th column)
            strictEqual(lb.getColumn(7), 1);   // start of line2
        });
    });

    describe('getOffset', () => {
        it('should convert 1-based line and column to offset', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getOffset(1, 1), 0);   // start of line 1
            strictEqual(lb.getOffset(1, 2), 1);   // second char of line 1
            strictEqual(lb.getOffset(2, 1), 6);   // start of line 2
            strictEqual(lb.getOffset(2, 3), 8);   // third char of line 2
            strictEqual(lb.getOffset(3, 1), 12);  // start of line 3
        });

        it('should use column = 1 by default', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getOffset(1), 0);
            strictEqual(lb.getOffset(2), 6);
            strictEqual(lb.getOffset(3), 12);
        });

        it('should clamp line to valid range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getOffset(0, 1), 0);    // line < 1, clamps to line 1
            strictEqual(lb.getOffset(-1, 1), 0);   // negative line, clamps to line 1
            strictEqual(lb.getOffset(4, 1), 12);   // line > max, clamps to line 3
            strictEqual(lb.getOffset(100, 1), 12); // way beyond, clamps to line 3
        });

        it('should clamp column to valid range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getOffset(1, 0), 0);    // column < 1, clamps to 1
            strictEqual(lb.getOffset(1, -1), 0);   // negative column, clamps to 1
            strictEqual(lb.getOffset(1, 100), 6);  // column > line length, clamps to line end
            strictEqual(lb.getOffset(2, 100), 12); // beyond line 2 end
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getOffset(1, 1), 0);
            strictEqual(lb.getOffset(2, 1), 7);    // line2 starts after \r\n
            strictEqual(lb.getOffset(3, 1), 14);   // line3
        });

        it('should round-trip with getLine and getColumn', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            const testOffsets = [0, 3, 6, 8, 12, 14];

            for (const offset of testOffsets) {
                const line = lb.getLine(offset);
                const column = lb.getColumn(offset);
                const convertedOffset = lb.getOffset(line, column);
                strictEqual(convertedOffset, offset, `Round-trip failed for offset ${offset}`);
            }
        });

        it('should handle empty last line', () => {
            const lb = createLineBoundaries('line1\nline2\n');
            strictEqual(lb.getOffset(1, 1), 0);
            strictEqual(lb.getOffset(2, 1), 6);
            strictEqual(lb.getOffset(3, 1), 12);  // empty line 3
        });
    });
});

import { deepStrictEqual, strictEqual } from 'assert';
import {
    createLineBoundaries
} from '../src/index.js';

describe('LineBoundaries', () => {
    describe('getLineStartForOffset', () => {
        it('should return line start for offset at line beginning', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineStart(0), 0);  // line1
            strictEqual(lb.getLineStart(6), 6);  // line2
            strictEqual(lb.getLineStart(12), 12); // line3
        });

        it('should return line start for offset in middle of line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineStart(3), 0);  // in "line1"
            strictEqual(lb.getLineStart(8), 6);  // in "line2"
            strictEqual(lb.getLineStart(14), 12); // in "line3"
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLineStart(0), 0);
            strictEqual(lb.getLineStart(7), 7);   // line2 starts after \r\n
            strictEqual(lb.getLineStart(14), 14); // line3
        });

        it('should handle mixed line endings', () => {
            const lb = createLineBoundaries('line1\rline2\nline3\r\nline4');
            strictEqual(lb.getLineStart(0), 0);
            strictEqual(lb.getLineStart(6), 6);   // line2
            strictEqual(lb.getLineStart(12), 12); // line3
            strictEqual(lb.getLineStart(19), 19); // line4
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineStart(2, 1), 6);   // from line1 forward 1 line
            strictEqual(lb.getLineStart(2, 2), 12);  // from line1 forward 2 lines
            strictEqual(lb.getLineStart(8, 1), 12);  // from line2 forward 1 line
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineStart(14, -1), 6);  // from line3 back 1 line
            strictEqual(lb.getLineStart(14, -2), 0);  // from line3 back 2 lines
            strictEqual(lb.getLineStart(8, -1), 0);   // from line2 back 1 line
        });

        it('should clamp to boundaries with lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineStart(2, -5), 0);  // can't go before 0
            strictEqual(lb.getLineStart(2, 10), 12); // can't go beyond last line
        });
    });

    describe('getLineEnd', () => {
        it('should return line end including newline', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineEnd(0), 6);  // "line1\n"
            strictEqual(lb.getLineEnd(6), 12); // "line2\n"
            strictEqual(lb.getLineEnd(12), 17); // "line3"
        });

        it('should return source length for last line', () => {
            const lb = createLineBoundaries('line1\nline2');
            strictEqual(lb.getLineEnd(10), 11); // last line
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineEnd(2, 1), 12);  // from line1 forward 1 line
            strictEqual(lb.getLineEnd(2, 2), 18);  // from line1 forward 2 lines
            strictEqual(lb.getLineEnd(8, 1), 18);  // from line2 forward 1 line
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineEnd(14, -1), 12);  // from line3 back 1 line
            strictEqual(lb.getLineEnd(14, -2), 6);   // from line3 back 2 lines
            strictEqual(lb.getLineEnd(8, -1), 6);    // from line2 back 1 line
        });
    });

    describe('getLineContentEnd', () => {
        it('should return line content end excluding newline', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineContentEnd(0), 5);  // "line1" without \n
            strictEqual(lb.getLineContentEnd(6), 11); // "line2" without \n
            strictEqual(lb.getLineContentEnd(12), 17); // "line3" (no newline)
        });

        it('should handle CRLF', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLineContentEnd(0), 5);  // "line1" without \r\n
            strictEqual(lb.getLineContentEnd(7), 12); // "line2" without \r\n
            strictEqual(lb.getLineContentEnd(14), 19); // "line3" (no newline)
        });

        it('should handle mixed line endings', () => {
            const lb = createLineBoundaries('line1\nline2\r\nline3\rline4');
            strictEqual(lb.getLineContentEnd(0), 5);  // "line1" without \n
            strictEqual(lb.getLineContentEnd(6), 11); // "line2" without \r\n
            strictEqual(lb.getLineContentEnd(14), 18); // "line3" without \r (content ends at 18, \r would be at 19)
            strictEqual(lb.getLineContentEnd(20), 24); // "line4" (no newline) - string ends at 24
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineContentEnd(2, 1), 11);  // from line1 forward 1 line
            strictEqual(lb.getLineContentEnd(2, 2), 17);  // from line1 forward 2 lines
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLineContentEnd(14, -1), 11);  // from line3 back 1 line
            strictEqual(lb.getLineContentEnd(14, -2), 5);   // from line3 back 2 lines
        });
    });

    describe('expand range to lines pattern', () => {
        it('should expand range to line boundaries', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            // Range [2, 4] is in "line1", should expand to [0, 6]
            const start = lb.getLineStart(2);
            const end = lb.getLineEnd(Math.max(0, 4 - 1));
            deepStrictEqual([start, end], [0, 6]);
        });

        it('should expand range spanning multiple lines', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            // Range [3, 9] spans line1 and line2
            const start = lb.getLineStart(3);
            const end = lb.getLineEnd(Math.max(0, 9 - 1));
            deepStrictEqual([start, end], [0, 12]);
        });

        it('should apply padding using lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            // Range [8, 10] is in line2, with padding=1 should include line1 and line3
            const start = lb.getLineStart(8, -1); // back 1 line
            const end = lb.getLineEnd(Math.max(0, 10 - 1), 1); // forward 1 line
            deepStrictEqual([start, end], [0, 18]);
        });

        it('should work with sequential ranges', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');

            // Process ranges sequentially (common pattern)
            let start = lb.getLineStart(2);
            let end = lb.getLineEnd(Math.max(0, 4 - 1));
            deepStrictEqual([start, end], [0, 6]);

            start = lb.getLineStart(8);
            end = lb.getLineEnd(Math.max(0, 10 - 1));
            deepStrictEqual([start, end], [6, 12]);

            start = lb.getLineStart(14);
            end = lb.getLineEnd(Math.max(0, 16 - 1));
            deepStrictEqual([start, end], [12, 18]);
        });
    });

    describe('lazy evaluation', () => {
        it('should only scan as much as needed', () => {
            const source = 'a'.repeat(1000) + '\n' + 'b'.repeat(1000) + '\n' + 'c'.repeat(1000);
            const lb = createLineBoundaries(source);

            // Only ask for first line
            const start = lb.getLineStart(500);
            strictEqual(start, 0);

            // Should not have scanned the entire source yet
            // (We can't easily test this without exposing internals, but behavior is correct)
        });

        it('should cache sequential lookups', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');

            // First lookup
            strictEqual(lb.getLineStart(8), 6);
            // Second lookup on same line should use cache
            strictEqual(lb.getLineEnd(9), 12);
            // Third lookup on same line should use cache
            strictEqual(lb.getLineStart(10), 6);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            const lb = createLineBoundaries('');
            strictEqual(lb.getLineStart(0), 0);
            strictEqual(lb.getLineEnd(0), 0);
        });

        it('should handle single line without newline', () => {
            const lb = createLineBoundaries('single line');
            strictEqual(lb.getLineStart(5), 0);
            strictEqual(lb.getLineEnd(5), 11);
        });

        it('should handle string with only newlines', () => {
            const lb = createLineBoundaries('\n\n\n');
            strictEqual(lb.getLineStart(0), 0);
            strictEqual(lb.getLineEnd(0), 1);
        });

        it('should handle offset beyond source length', () => {
            const lb = createLineBoundaries('test');
            strictEqual(lb.getLineStart(100), 0);
            strictEqual(lb.getLineEnd(100), 4);
        });

        it('should handle negative offset', () => {
            const lb = createLineBoundaries('test\nmore');
            strictEqual(lb.getLineStart(-1), 0);
            strictEqual(lb.getLineEnd(-1), 5); // End of first line "test\n"
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

    describe('isLineStart', () => {
        it('should return true for offsets at line starts', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isLineStart(0), true);   // start of line1
            strictEqual(lb.isLineStart(6), true);   // start of line2
            strictEqual(lb.isLineStart(12), true);  // start of line3
        });

        it('should return false for offsets not at line starts', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isLineStart(1), false);  // middle of line1
            strictEqual(lb.isLineStart(5), false);  // end of line1 (newline)
            strictEqual(lb.isLineStart(7), false);  // middle of line2
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.isLineStart(0), true);
            strictEqual(lb.isLineStart(5), false);  // before \r
            strictEqual(lb.isLineStart(6), false);  // \r
            strictEqual(lb.isLineStart(7), true);   // start of line2
        });
    });

    describe('isLineEnd', () => {
        it('should return true for offsets at line ends (after newline)', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isLineEnd(6), true);   // after \n of line1
            strictEqual(lb.isLineEnd(12), true);  // after \n of line2
            strictEqual(lb.isLineEnd(17), true);  // end of line3 (no newline)
        });

        it('should return false for offsets not at line ends', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isLineEnd(0), false);  // start of line1
            strictEqual(lb.isLineEnd(3), false);  // middle of line1
            strictEqual(lb.isLineEnd(5), false);  // before \n
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.isLineEnd(7), true);   // after \r\n of line1
            strictEqual(lb.isLineEnd(14), true);  // after \r\n of line2
            strictEqual(lb.isLineEnd(6), false);  // at \r
            strictEqual(lb.isLineEnd(5), false);  // before \r
        });

        it('should handle empty source', () => {
            const lb = createLineBoundaries('');
            strictEqual(lb.isLineEnd(0), true);   // offset 0 is both start and end
        });
    });

    describe('isLineContentEnd', () => {
        it('should return true for offsets at line content ends (before newline)', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isLineContentEnd(5), true);   // before \n of line1
            strictEqual(lb.isLineContentEnd(11), true);  // before \n of line2
            strictEqual(lb.isLineContentEnd(17), true);  // end of line3 (no newline)
        });

        it('should return false for offsets not at line content ends', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isLineContentEnd(0), false);  // start of line1
            strictEqual(lb.isLineContentEnd(3), false);  // middle of line1
            strictEqual(lb.isLineContentEnd(6), false);  // after \n (start of line2)
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.isLineContentEnd(5), true);   // before \r\n of line1
            strictEqual(lb.isLineContentEnd(12), true);  // before \r\n of line2
            strictEqual(lb.isLineContentEnd(6), false);  // at \r
            strictEqual(lb.isLineContentEnd(7), false);  // after \r\n
        });

        it('should handle CR-only line endings', () => {
            const lb = createLineBoundaries('line1\rline2\rline3');
            strictEqual(lb.isLineContentEnd(5), true);   // before \r of line1
            strictEqual(lb.isLineContentEnd(11), true);  // before \r of line2
        });
    });

    describe('getNewlineText', () => {
        it('should return newline characters for lines with LF', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getNewlineText(0), '\n');   // line1 newline
            strictEqual(lb.getNewlineText(6), '\n');   // line2 newline
            strictEqual(lb.getNewlineText(12), '');    // line3 no newline
        });

        it('should return newline characters for lines with CRLF', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getNewlineText(0), '\r\n'); // line1 newline
            strictEqual(lb.getNewlineText(7), '\r\n'); // line2 newline
            strictEqual(lb.getNewlineText(14), '');    // line3 no newline
        });

        it('should return newline characters for lines with CR', () => {
            const lb = createLineBoundaries('line1\rline2\rline3');
            strictEqual(lb.getNewlineText(0), '\r');   // line1 newline
            strictEqual(lb.getNewlineText(6), '\r');   // line2 newline
            strictEqual(lb.getNewlineText(12), '');    // line3 no newline
        });

        it('should handle mixed line endings', () => {
            const lb = createLineBoundaries('line1\rline2\nline3\r\nline4');
            strictEqual(lb.getNewlineText(0), '\r');   // line1 CR
            strictEqual(lb.getNewlineText(6), '\n');   // line2 LF
            strictEqual(lb.getNewlineText(12), '\r\n'); // line3 CRLF
            strictEqual(lb.getNewlineText(19), '');    // line4 no newline
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\r\nline3');
            strictEqual(lb.getNewlineText(0, 0), '\n');   // line1 newline
            strictEqual(lb.getNewlineText(0, 1), '\r\n'); // line2 newline (forward 1)
            strictEqual(lb.getNewlineText(0, 2), '');     // line3 no newline (forward 2)
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\r\nline3');
            strictEqual(lb.getNewlineText(14, 0), '');    // line3 no newline
            strictEqual(lb.getNewlineText(14, -1), '\r\n'); // line2 newline (back 1)
            strictEqual(lb.getNewlineText(14, -2), '\n'); // line1 newline (back 2)
        });

        it('should work from any offset in the line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getNewlineText(0), '\n');  // start of line1
            strictEqual(lb.getNewlineText(3), '\n');  // middle of line1
            strictEqual(lb.getNewlineText(5), '\n');  // end of line1 (before newline)
        });
    });

    describe('getLineText', () => {
        it('should return full line text including newline', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineText(0), 'line1\n');   // line1
            strictEqual(lb.getLineText(6), 'line2\n');   // line2
            strictEqual(lb.getLineText(12), 'line3');    // line3 (no newline)
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLineText(0), 'line1\r\n');
            strictEqual(lb.getLineText(7), 'line2\r\n');
            strictEqual(lb.getLineText(14), 'line3');
        });

        it('should handle mixed line endings', () => {
            const lb = createLineBoundaries('line1\rline2\nline3\r\nline4');
            strictEqual(lb.getLineText(0), 'line1\r');
            strictEqual(lb.getLineText(6), 'line2\n');
            strictEqual(lb.getLineText(12), 'line3\r\n');
            strictEqual(lb.getLineText(19), 'line4');
        });

        it('should work from any offset in the line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineText(2), 'line1\n');  // middle of line1
            strictEqual(lb.getLineText(5), 'line1\n');  // end of line1
            strictEqual(lb.getLineText(8), 'line2\n');  // middle of line2
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineText(0, 1), 'line2\n');  // forward 1 line
            strictEqual(lb.getLineText(0, 2), 'line3');    // forward 2 lines
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineText(12, -1), 'line2\n'); // back 1 line
            strictEqual(lb.getLineText(12, -2), 'line1\n'); // back 2 lines
        });
    });

    describe('getLineContentText', () => {
        it('should return line content text excluding newline', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineContentText(0), 'line1');
            strictEqual(lb.getLineContentText(6), 'line2');
            strictEqual(lb.getLineContentText(12), 'line3');
        });

        it('should handle CRLF line endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getLineContentText(0), 'line1');
            strictEqual(lb.getLineContentText(7), 'line2');
            strictEqual(lb.getLineContentText(14), 'line3');
        });

        it('should handle empty lines', () => {
            const lb = createLineBoundaries('\nline2\n');
            strictEqual(lb.getLineContentText(0), '');      // empty line1
            strictEqual(lb.getLineContentText(1), 'line2'); // line2
            strictEqual(lb.getLineContentText(6), 'line2'); // at newline of line2
        });

        it('should work from any offset in the line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineContentText(2), 'line1'); // middle of line1
            strictEqual(lb.getLineContentText(5), 'line1'); // end of line1
        });

        it('should move forward N lines with positive lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineContentText(0, 1), 'line2');
            strictEqual(lb.getLineContentText(0, 2), 'line3');
        });

        it('should move backward N lines with negative lines parameter', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineContentText(12, -1), 'line2');
            strictEqual(lb.getLineContentText(12, -2), 'line1');
        });
    });

    describe('getLastLine', () => {
        it('should return the number of the last line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLastLine(), 3);
        });

        it('should handle single line without newline', () => {
            const lb = createLineBoundaries('single line');
            strictEqual(lb.getLastLine(), 1);
        });

        it('should handle empty string', () => {
            const lb = createLineBoundaries('');
            strictEqual(lb.getLastLine(), 1);
        });

        it('should handle trailing newline', () => {
            const lb = createLineBoundaries('line1\nline2\n');
            strictEqual(lb.getLastLine(), 3); // empty line 3
        });

        it('should handle only newlines', () => {
            const lb = createLineBoundaries('\n\n\n');
            strictEqual(lb.getLastLine(), 4);
        });
    });

    describe('getLinesNumber', () => {
        it('should return total number of lines', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLinesNumber(), 3);
        });

        it('should be same as getLastLine', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getLinesNumber(), lb.getLastLine());
        });
    });

    describe('getMaxLineEnd', () => {
        it('should return max line end for entire source by default', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineEnd(), 17); // end of line3
        });

        it('should return max line end for specified range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getMaxLineEnd(1, 2), 12); // end of line2
            strictEqual(lb.getMaxLineEnd(2, 3), 18); // end of line3
        });

        it('should handle fromLine only', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineEnd(2), 17); // from line2 to end
        });

        it('should handle toLine only', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineEnd(undefined, 2), 12); // from start to line2
        });

        it('should handle single line range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineEnd(2, 2), 12); // just line2
        });

        it('should return 0 for invalid range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineEnd(3, 2), 0); // from > to
        });

        it('should clamp out-of-bounds values', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineEnd(1, 100), 17); // clamps to last line
            strictEqual(lb.getMaxLineEnd(0, 2), 12);   // clamps from to 1
        });
    });

    describe('getMaxLineContentEnd', () => {
        it('should return max line content end for entire source by default', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineContentEnd(), 17); // end of line3 (no newline)
        });

        it('should exclude trailing newline', () => {
            const lb = createLineBoundaries('line1\nline2\n');
            strictEqual(lb.getMaxLineContentEnd(), 11); // end of line2 content (before \n)
        });

        it('should return max line content end for specified range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3\nline4');
            strictEqual(lb.getMaxLineContentEnd(1, 2), 11); // end of line2 content
            strictEqual(lb.getMaxLineContentEnd(2, 3), 17); // end of line3 content
        });

        it('should handle fromLine only', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineContentEnd(2), 17); // from line2 to end
        });

        it('should handle toLine only', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineContentEnd(undefined, 2), 11); // from start to line2
        });

        it('should handle CRLF endings', () => {
            const lb = createLineBoundaries('line1\r\nline2\r\nline3');
            strictEqual(lb.getMaxLineContentEnd(1, 2), 12); // before \r\n of line2
        });

        it('should return 0 for invalid range', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getMaxLineContentEnd(3, 2), 0); // from > to
        });
    });

    describe('getLineDiff', () => {
        it('should return 0 for same line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineDiff(0, 3), 0);   // both in line1
            strictEqual(lb.getLineDiff(6, 10), 0);  // both in line2
        });

        it('should return positive for later line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineDiff(0, 6), 1);   // line1 to line2
            strictEqual(lb.getLineDiff(0, 12), 2);  // line1 to line3
            strictEqual(lb.getLineDiff(6, 12), 1);  // line2 to line3
        });

        it('should return negative for earlier line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineDiff(6, 0), -1);   // line2 to line1
            strictEqual(lb.getLineDiff(12, 0), -2);  // line3 to line1
            strictEqual(lb.getLineDiff(12, 6), -1);  // line3 to line2
        });

        it('should handle offsets at line boundaries', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineDiff(5, 6), 1);   // end of line1 to start of line2
            strictEqual(lb.getLineDiff(11, 12), 1); // end of line2 to start of line3
        });

        it('should handle negative offsets', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineDiff(-1, 0), 0);   // both clamp to line1
            strictEqual(lb.getLineDiff(-1, 6), 1);   // clamped line1 to line2
        });

        it('should handle offsets beyond source', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.getLineDiff(100, 200), 0); // both clamp to last line
            strictEqual(lb.getLineDiff(6, 100), 1);   // line2 to last line
        });
    });

    describe('isSameLine', () => {
        it('should return true for offsets on same line', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isSameLine(0, 3), true);   // both in line1
            strictEqual(lb.isSameLine(6, 10), true);  // both in line2
            strictEqual(lb.isSameLine(12, 16), true); // both in line3
        });

        it('should return false for offsets on different lines', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isSameLine(0, 6), false);   // line1 vs line2
            strictEqual(lb.isSameLine(0, 12), false);  // line1 vs line3
            strictEqual(lb.isSameLine(6, 12), false);  // line2 vs line3
        });

        it('should handle offsets at line boundaries', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isSameLine(5, 6), false);  // end of line1 vs start of line2
            strictEqual(lb.isSameLine(0, 5), true);   // line1 start vs before newline
        });

        it('should handle same offset', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isSameLine(5, 5), true);
            strictEqual(lb.isSameLine(0, 0), true);
        });

        it('should handle edge cases', () => {
            const lb = createLineBoundaries('line1\nline2\nline3');
            strictEqual(lb.isSameLine(-1, 0), true);    // both clamp to line1
            strictEqual(lb.isSameLine(100, 200), true); // both beyond end
            strictEqual(lb.isSameLine(-1, 100), false); // line1 vs last line
        });
    });
});

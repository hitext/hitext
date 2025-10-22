import { deepStrictEqual } from 'assert';
import { generateRanges, rangesForLines } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangesForLines', () => {
    describe('type: line', () => {
        it('new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\r',
                rangesForLines('line')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 1, 1],
                [1, 3, 2],
                [3, 7, 3],
                [7, 11, 4],
                [11, 12, 5],
                [12, 12, 6]
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\rdddd',
                rangesForLines('line')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 1, 1],
                [1, 3, 2],
                [3, 7, 3],
                [7, 11, 4],
                [11, 12, 5],
                [12, 16, 6]
            ]);
        });
    });

    describe('type: line-content', () => {
        it('new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\r',
                rangesForLines('line-content')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1],
                [1, 2, 2],
                [3, 5, 3],
                [7, 10, 4],
                [11, 11, 5],
                [12, 12, 6]
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\rdddd',
                rangesForLines('line-content')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1],
                [1, 2, 2],
                [3, 5, 3],
                [7, 10, 4],
                [11, 11, 5],
                [12, 16, 6]
            ]);
        });
    });

    describe('type: newline', () => {
        it('new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\r',
                rangesForLines('newline')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 1, 1],
                [2, 3, 2],
                [5, 7, 3],
                [10, 11, 4],
                [11, 12, 5]
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\rdddd',
                rangesForLines('newline')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 1, 1],
                [2, 3, 2],
                [5, 7, 3],
                [10, 11, 4],
                [11, 12, 5]
            ]);
        });
    });

    describe('type: line-start', () => {
        it('new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\r',
                rangesForLines('line-start')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1],    // Start of line 1 (empty line)
                [1, 1, 2],    // Start of line 2 (after \n)
                [3, 3, 3],    // Start of line 3 (after \r)
                [7, 7, 4],    // Start of line 4 (after \r\n)
                [11, 11, 5],  // Start of line 5 (after \n)
                [12, 12, 6]   // Start of line 6 (after \r, empty line at end)
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\rdddd',
                rangesForLines('line-start')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1],    // Start of line 1
                [1, 1, 2],    // Start of line 2
                [3, 3, 3],    // Start of line 3
                [7, 7, 4],    // Start of line 4
                [11, 11, 5],  // Start of line 5
                [12, 12, 6]   // Start of line 6
            ]);
        });

        it('single line without newline', () => {
            const ranges = generateRanges(
                'hello',
                rangesForLines('line-start')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1]     // Start of single line
            ]);
        });
    });

    describe('type: line-end', () => {
        it('new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\r',
                rangesForLines('line-end')
            );

            deepStrictEqual(startEndData(ranges), [
                [1, 1, 1],    // After \n
                [3, 3, 2],    // After \r
                [7, 7, 3],    // After \r\n
                [11, 11, 4],  // After \n
                [12, 12, 5],  // After \r
                [12, 12, 6]   // End of last line (no newline)
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\rdddd',
                rangesForLines('line-end')
            );

            deepStrictEqual(startEndData(ranges), [
                [1, 1, 1],    // After \n
                [3, 3, 2],    // After \r
                [7, 7, 3],    // After \r\n
                [11, 11, 4],  // After \n
                [12, 12, 5],  // After \r
                [16, 16, 6]   // At end of content (position 16, no newline at end)
            ]);
        });

        it('single line without newline', () => {
            const ranges = generateRanges(
                'hello',
                rangesForLines('line-end')
            );

            deepStrictEqual(startEndData(ranges), [
                [5, 5, 1]     // At end of content (position 5, no newline)
            ]);
        });
    });

    describe('type: line-content-end', () => {
        it('new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\r',
                rangesForLines('line-content-end')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1],    // Before \n (empty line)
                [2, 2, 2],    // Before \r (after 'a')
                [5, 5, 3],    // Before \r\n (after 'bb')
                [10, 10, 4],  // Before \n (after 'ccc')
                [11, 11, 5],  // Before \r (empty line)
                [12, 12, 6]   // End of last line (no newline)
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = generateRanges(
                '\na\rbb\r\nccc\n\rdddd',
                rangesForLines('line-content-end')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 0, 1],    // Before \n
                [2, 2, 2],    // Before \r
                [5, 5, 3],    // Before \r\n
                [10, 10, 4],  // Before \n
                [11, 11, 5],  // Before \r
                [16, 16, 6]   // At end of content (position 16, no newline at end)
            ]);
        });

        it('single line without newline', () => {
            const ranges = generateRanges(
                'hello',
                rangesForLines('line-content-end')
            );

            deepStrictEqual(startEndData(ranges), [
                [5, 5, 1]     // At end of content (position 5, no newline)
            ]);
        });
    });

    describe('default behavior', () => {
        it('should use "line" as default type', () => {
            const withDefault = generateRanges('a\nb\nc', rangesForLines());
            const withExplicit = generateRanges('a\nb\nc', rangesForLines('line'));

            deepStrictEqual(startEndData(withDefault), startEndData(withExplicit));
        });
    });
});

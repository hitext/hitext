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
});

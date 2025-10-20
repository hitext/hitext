import { deepStrictEqual } from 'assert';
import { generateRanges, rangeLines } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeLines', () => {
    it('new-line ending input', () => {
        const ranges = generateRanges('\na\rbb\r\nccc\n\r', rangeLines);
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
        const ranges = generateRanges('\na\rbb\r\nccc\n\rdddd', rangeLines);
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

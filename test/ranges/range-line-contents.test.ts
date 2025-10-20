import { deepStrictEqual } from 'assert';
import { generateRanges, rangeLineContents } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeLineContents', () => {
    it('new-line ending input', () => {
        const ranges = generateRanges('\na\rbb\r\nccc\n\r', rangeLineContents);
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
        const ranges = generateRanges('\na\rbb\r\nccc\n\rdddd', rangeLineContents);
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

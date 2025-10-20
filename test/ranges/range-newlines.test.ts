import { deepStrictEqual } from 'assert';
import { generateRanges, rangeNewlines } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeNewlines', () => {
    it('new-line ending input', () => {
        const ranges = generateRanges('\na\rbb\r\nccc\n\r', rangeNewlines);
        deepStrictEqual(startEndData(ranges), [
            [0, 1, 1],
            [2, 3, 2],
            [5, 7, 3],
            [10, 11, 4],
            [11, 12, 5]
        ]);
    });

    it('non-new-line ending input', () => {
        const ranges = generateRanges('\na\rbb\r\nccc\n\rdddd', rangeNewlines);
        deepStrictEqual(startEndData(ranges), [
            [0, 1, 1],
            [2, 3, 2],
            [5, 7, 3],
            [10, 11, 4],
            [11, 12, 5]
        ]);
    });
});

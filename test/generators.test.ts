import { deepStrictEqual } from 'assert';
import type { GenerateRanges, RangeRecord } from '../src/types.js';
import {
    generateRanges,
    rangeLines,
    rangeLineContents,
    rangeNewlines
} from '../src/index.js';
import { startEndData } from './utils.js';

function gen(source: string, ranges: GenerateRanges): RangeRecord[] {
    return generateRanges(source, ranges, Symbol('test'));
}

describe('built-in generators', () => {
    describe('line', () => {
        it('new-line ending input', () => {
            const ranges = gen('\na\rbb\r\nccc\n\r', rangeLines);
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
            const ranges = gen('\na\rbb\r\nccc\n\rdddd', rangeLines);
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

    describe('lineContent', () => {
        it('new-line ending input', () => {
            const ranges = gen('\na\rbb\r\nccc\n\r', rangeLineContents);
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
            const ranges = gen('\na\rbb\r\nccc\n\rdddd', rangeLineContents);
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

    describe('newLine', () => {
        it('new-line ending input', () => {
            const ranges = gen('\na\rbb\r\nccc\n\r', rangeNewlines);
            deepStrictEqual(startEndData(ranges), [
                [0, 1, 1],
                [2, 3, 2],
                [5, 7, 3],
                [10, 11, 4],
                [11, 12, 5]
            ]);
        });

        it('non-new-line ending input', () => {
            const ranges = gen('\na\rbb\r\nccc\n\rdddd', rangeNewlines);
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

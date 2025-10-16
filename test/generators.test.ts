import { deepStrictEqual } from 'assert';
import type { GenerateRanges, Range } from '../src/types.js';
import {
    generateRangesFromLayers,
    rangeLines,
    rangeLineContents,
    rangeMatch,
    rangeNewlines
} from '../src/index.js';

const testMarker = Symbol('test');

function gen(source: string, ranges: GenerateRanges): Range[] {
    return generateRangesFromLayers(source, [{
        marker: testMarker,
        ranges
    }]);
}

const startEndData = (ranges: Range[]) => ranges.map(r => [r.start, r.end, r.data]);

describe('built-in generators', () => {
    describe('rangeMatch', () => {
        it('using string', () => {
            const ranges = gen('Hello world! Hello world!', rangeMatch('world'));
            deepStrictEqual(startEndData(ranges), [
                [6, 11, undefined],
                [19, 24, undefined]
            ]);
        });

        it('using regexp', () => {
            const ranges = gen('Hello world!', rangeMatch(/\w+/));
            deepStrictEqual(startEndData(ranges), [
                [0, 5, undefined],
                [6, 11, undefined]
            ]);
        });

        it('using regexp with flags', () => {
            const ranges = gen('Hello world!', rangeMatch(/hello|world/ig));
            deepStrictEqual(startEndData(ranges), [
                [0, 5, undefined],
                [6, 11, undefined]
            ]);
        });

        it('using non-string and non-regexp value', () => {
            const ranges = gen('1234567890', rangeMatch('234'));
            deepStrictEqual(startEndData(ranges), [
                [1, 4, undefined]
            ]);
        });
    });

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

import { deepStrictEqual } from 'assert';
import type { GenerateRanges, RangeRecord } from '../src/types.js';
import {
    generateRanges,
    rangeLines,
    rangeLineContents,
    rangeMatch,
    rangeNewlines
} from '../src/index.js';

function gen(source: string, ranges: GenerateRanges): RangeRecord[] {
    return generateRanges(source, Symbol('test'), ranges);
}

const startEndData = (ranges: RangeRecord[]) => ranges.map(r => [r.start, r.end, r.data]);
const regexpMatch = (input: string, match: string[] | null, index: number) => {
    return match ? Object.assign(match, { input, index, groups: undefined }) : null;
};

describe('built-in generators', () => {
    describe('rangeMatch', () => {
        it('using string', () => {
            const ranges = gen('Hello world! Hello world!', rangeMatch('world'));
            deepStrictEqual(startEndData(ranges), [
                [6, 11, 'world'],
                [19, 24, 'world']
            ]);
        });

        it('using regexp', () => {
            const input = 'Hello world!';
            const ranges = gen(input, rangeMatch(/\w+/));
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('using regexp with flags', () => {
            const input = 'Hello world!';
            const ranges = gen(input, rangeMatch(/hello|world/ig));
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('using non-string and non-regexp value', () => {
            const input = '1234567890';
            const ranges = gen(input, rangeMatch(234 as any));
            deepStrictEqual(startEndData(ranges), [
                [1, 4, '234']
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

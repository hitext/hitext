import { deepEqual } from 'assert';
import { generateRanges } from '../src/generateRanges.js';
import type { Generator } from '../src/types.d.js';

const stubGeneratorFactory = (marker: symbol | number, ranges: Array<[number, number, string]>): Generator => ({
    marker,
    generate: (source: string, createRange) =>
        ranges.forEach(range => createRange(...range))
});

describe('genRanges', () => {
    it('no generators', () => {
        deepEqual(generateRanges('abc', []), []);
    });

    it('single decorator', () => {
        deepEqual(
            generateRanges('abc', [
                stubGeneratorFactory(0, [
                    [0, 1, '1'],
                    [2, 3, '2']
                ])
            ]), [
                { type: 0, start: 0, end: 1, data: '1' },
                { type: 0, start: 2, end: 3, data: '2' }
            ]);
    });

    it('several generators', () => {
        const marker0 = 0;
        const marker1 = 1;

        deepEqual(
            generateRanges('abc', [
                stubGeneratorFactory(marker0, [
                    [0, 1, '1'],
                    [2, 3, '2']
                ]),
                stubGeneratorFactory(marker1, [
                    [1, 2, 'a'],
                    [2, 3, 'b']
                ])
            ]), [
                { type: marker0, start: 0, end: 1, data: '1' },
                { type: marker0, start: 2, end: 3, data: '2' },
                { type: marker1, start: 1, end: 2, data: 'a' },
                { type: marker1, start: 2, end: 3, data: 'b' }
            ]);
    });
});

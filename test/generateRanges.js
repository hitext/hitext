import { deepEqual } from 'assert';
import mode from './helpers/mode.js';
import generateRanges from '../lib/generateRanges.mjs';

const stubGeneratorFactory = (marker, ranges) => ({
    marker,
    generate: (source, createRange) =>
        ranges.forEach(range => createRange(...range))
});

describe('genRanges', () => {
    if (mode !== 'src') {
        return;
    }

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
        deepEqual(
            generateRanges('abc', [
                stubGeneratorFactory(0, [
                    [0, 1, '1'],
                    [2, 3, '2']
                ]),
                stubGeneratorFactory(1, [
                    [1, 2, 'a'],
                    [2, 3, 'b']
                ])
            ]), [
                { type: 0, start: 0, end: 1, data: '1' },
                { type: 0, start: 2, end: 3, data: '2' },
                { type: 1, start: 1, end: 2, data: 'a' },
                { type: 1, start: 2, end: 3, data: 'b' }
            ]);
    });
});

const assert = require('assert');
const mode = require('./helpers/mode');
const generateRanges = require('../src/generateRanges');
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
        assert.deepEqual(generateRanges('abc', []), []);
    });

    it('single decorator', () => {
        assert.deepEqual(
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
        assert.deepEqual(
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

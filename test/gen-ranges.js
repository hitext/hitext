const assert = require('assert');
const hitext = require('../src');
const stubDecoratorFactory = require('./helpers/decorators').stub;

describe('genRanges', () => {
    it('no decorators', () => {
        assert.deepEqual(hitext.generateRanges('abc'), []);
        assert.deepEqual(hitext.generateRanges('abc', []), []);
        assert.deepEqual(hitext.generateRanges('abc', {}), []);
    });

    it('single decorator', () => {
        assert.deepEqual(
            hitext.generateRanges('abc', [
                stubDecoratorFactory([
                    [0, 1, '1'],
                    [2, 3, '2']
                ])
            ]), [
                { type: 0, start: 0, end: 1, data: '1' },
                { type: 0, start: 2, end: 3, data: '2' }
            ]);
    });

    it('several decorators', () => {
        assert.deepEqual(
            hitext.generateRanges('abc', [
                stubDecoratorFactory([
                    [0, 1, '1'],
                    [2, 3, '2']
                ]),
                stubDecoratorFactory([
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

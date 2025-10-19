import { deepStrictEqual } from 'assert';
import { rangeResetOrigin, generateRanges } from '../src/index.js';
import { rangeWithoutMarker } from './utils.js';

describe('rangeResetOrigin', () => {
    it('should discard existing origin', () => {
        const source = 'hello world';
        const input = [
            { start: 0, end: 5, data: 'test', origin: { start: 10, end: 20, data: 'old' } }
        ];
        const ranges = generateRanges(source, rangeResetOrigin(input));

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [0, 5, 'test', undefined]
        ]);
    });

    it('should keep origin undefined when no existing origin', () => {
        const source = 'hello world';
        const ranges = generateRanges(source, rangeResetOrigin([[0, 5], [6, 11]]));

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [0, 5, undefined, undefined],
            [6, 11, undefined, undefined]
        ]);
    });

    it('should preserve data while discarding origin', () => {
        const source = 'hello world';
        const input = [
            { start: 0, end: 5, data: { type: 'word', value: 'hello' } },
            { start: 6, end: 11, data: { type: 'word', value: 'world' } }
        ];
        const ranges = generateRanges(source, rangeResetOrigin(input));

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [0, 5, { type: 'word', value: 'hello' }, undefined],
            [6, 11, { type: 'word', value: 'world' }, undefined]
        ]);
    });

    it('should work with zero-width ranges', () => {
        const source = 'hello world';
        const ranges = generateRanges(source, rangeResetOrigin([[5, 5]]));

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [5, 5, undefined, undefined]
        ]);
    });

    it('should discard complex array origins', () => {
        const source = 'hello world test';
        const input = [
            {
                start: 0,
                end: 5,
                data: 'a',
                origin: [
                    { start: 100, end: 105, data: 'orig1' },
                    { start: 200, end: 205, data: 'orig2' }
                ]
            },
            {
                start: 6,
                end: 11,
                data: 'b',
                origin: { start: 300, end: 305, data: 'orig3' }
            }
        ];
        const ranges = generateRanges(source, rangeResetOrigin(input));

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [0, 5, 'a', undefined],
            [6, 11, 'b', undefined]
        ]);
    });
});

import { deepStrictEqual } from 'assert';
import { generateRanges, rangesFrom } from '../../src/index.js';
import { renderRanges, startEndData } from '../utils.js';

describe('rangesFrom', () => {
    it('should work with generator function', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom(function*() {
                yield[0, 5];
                yield[6, 11, { type: 'test' }];
                yield{ start: 2, end: 5 };
                yield{ start: 3, end: 11, data: { type: 'test' } };
            })
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, { type: 'test' }],
            [2, 5, undefined],
            [3, 11, { type: 'test' }]
        ]);
    });

    it('should pass source and renderOptions to generator', () => {
        const result = generateRanges(
            'test',
            rangesFrom(function*(source, options) {
                yield[0, 4, { source, options }];
            }),
            { renderOptions: { render: 'options' } }
        );

        deepStrictEqual(startEndData(result), [
            [0, 4, { source: 'test', options: { render: 'options' } }]
        ]);
    });

    it('should work with function returning array', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom<any>((source, renderOptions) => [
                [0, 1],
                [2, 4, { source }],
                { start: 3, end: 5 },
                { start: 4, end: 11, data: { renderOptions } }
            ]),
            { renderOptions: 'options' }
        );

        deepStrictEqual(startEndData(result), [
            [0, 1, undefined],
            [2, 4, { source: 'Hello world' }],
            [3, 5, undefined],
            [4, 11, { renderOptions: 'options' }]
        ]);
    });

    it('should work with function returning GenerateRanges', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom(() => (source, createRange, context) => {
                createRange(0, 5);
                createRange(6, 11, { test: source, renderOptions: context?.renderOptions });
            }),
            { renderOptions: { someOption: true } }
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, { test: 'Hello world', renderOptions: { someOption: true } }]
        ]);
    });

    it('should work with array of ranges', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom([
                [0, 5],
                [6, 11, { type: 'test' }],
                { start: 2, end: 5 },
                { start: 3, end: 11, data: { type: 'test' } }
            ])
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, { type: 'test' }],
            [2, 5, undefined],
            [3, 11, { type: 'test' }]
        ]);
    });

    it('should work with Set', () => {
        const result = renderRanges(
            'Hello world',
            rangesFrom(new Set([[0, 5], [6, 11]]))
        );

        deepStrictEqual(result, ['Hello', 'world']);
    });

    it('should handle empty generator', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom(function*() {
                // No yields
            })
        );

        deepStrictEqual(startEndData(result), []);
    });

    it('should handle empty array', () => {
        const result = renderRanges(
            'Hello world',
            rangesFrom([])
        );

        deepStrictEqual(result, []);
    });
});

import { deepStrictEqual } from 'assert';
import { generateRanges, rangeFrom } from '../../src/index.js';
import { renderRanges, startEndData } from '../utils.js';

describe('rangeFrom', () => {
    describe('Generator function input', () => {
        it('should work with generator function yielding ranges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFrom(function*() {
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
                rangeFrom(function*(source, options) {
                    yield[0, 4, { source, options }];
                }),
                { renderOptions: { render: 'options' } }
            );

            deepStrictEqual(startEndData(result), [
                [0, 4, { source: 'test', options: { render: 'options' } }]
            ]);
        });

        it('should handle empty generator', () => {
            const result = generateRanges(
                'Hello world',
                rangeFrom(function*() {
                    // No yields
                })
            );

            deepStrictEqual(startEndData(result), []);
        });
    });

    describe('Function returning iterable', () => {
        it('should work with function returning array of tuples', () => {
            const result = generateRanges(
                'Hello world',
                rangeFrom<any>((source, renderOptions) => [
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

        it('should work with function returning empty array', () => {
            const result = renderRanges(
                'Hello world',
                rangeFrom(() => [])
            );

            deepStrictEqual(result, []);
        });
    });

    describe('Function returning GenerateRanges', () => {
        it('should work with function returning GenerateRanges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFrom(() => (source, createRange, context) => {
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
    });

    describe('Direct iterable input', () => {
        it('should work with array of ranges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFrom([
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

        it('should work with empty array', () => {
            const result = renderRanges(
                'Hello world',
                rangeFrom([])
            );

            deepStrictEqual(result, []);
        });

        it('should work with Set', () => {
            const result = renderRanges(
                'Hello world',
                rangeFrom(new Set([[0, 5], [6, 11]]))
            );

            deepStrictEqual(result, ['Hello', 'world']);
        });
    });

    describe('Edge cases', () => {
        it('should work with generator using source content and options', () => {
            const result = renderRanges(
                'Hello world',
                rangeFrom(function*(source, renderOptions) {
                    // Find all words
                    const words = source.match(renderOptions?.pattern || /fail/) || [];
                    let offset = 0;
                    for (const word of words) {
                        const index = source.indexOf(word, offset);
                        yield[index, index + word.length];
                        offset = index + word.length;
                    }
                }),
                { pattern: /\w+/g }
            );

            deepStrictEqual(result, ['Hello', 'world']);
        });
    });
});

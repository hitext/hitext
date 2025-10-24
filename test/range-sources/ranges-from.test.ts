import { deepStrictEqual } from 'assert';
import { generateRanges, rangesFrom } from '../../src/index.js';
import { renderRanges, startEndData } from '../utils.js';

describe('rangesFrom', () => {
    describe('document keywords', () => {
        it("'document' should create range for entire document", () => {
            const ranges = generateRanges('Hello world', rangesFrom('document'));
            deepStrictEqual(startEndData(ranges), [[0, 11, undefined]]);
        });

        it("'document-start' should create zero-length range at position 0", () => {
            const ranges = generateRanges('Hello world', rangesFrom('document-start'));
            deepStrictEqual(startEndData(ranges), [[0, 0, undefined]]);
        });

        it("'document-end' should create zero-length range at end of content", () => {
            const ranges = generateRanges('Hello world', rangesFrom('document-end'));
            deepStrictEqual(startEndData(ranges), [[11, 11, undefined]]);
        });
    });

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

    it('should pass document and renderOptions to generator', () => {
        const result = generateRanges(
            'test',
            rangesFrom(function*(document, options) {
                yield[0, 4, { document, options }];
            }),
            { renderOptions: { render: 'options' } }
        );

        deepStrictEqual(startEndData(result), [
            [0, 4, { document: 'test', options: { render: 'options' } }]
        ]);
    });

    it('should work with function returning array', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom<any>((document, renderOptions) => [
                [0, 1],
                [2, 4, { document }],
                { start: 3, end: 5 },
                { start: 4, end: 11, data: { renderOptions } }
            ]),
            { renderOptions: 'options' }
        );

        deepStrictEqual(startEndData(result), [
            [0, 1, undefined],
            [2, 4, { document: 'Hello world' }],
            [3, 5, undefined],
            [4, 11, { renderOptions: 'options' }]
        ]);
    });

    it('should work with function returning GenerateRanges', () => {
        const result = generateRanges(
            'Hello world',
            rangesFrom(() => (document, createRange, context) => {
                createRange(0, 5);
                createRange(6, 11, { test: document, renderOptions: context?.renderOptions });
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

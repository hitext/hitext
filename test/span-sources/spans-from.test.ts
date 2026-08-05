import { deepStrictEqual } from 'assert';
import { generateSpans, spansFrom } from '../../src/index.js';
import { renderSpans, startEndData } from '../utils.js';

describe('spansFrom', () => {
    describe('document keywords', () => {
        it("'document' should create span for entire document", () => {
            const spans = generateSpans('Hello world', spansFrom('document'));
            deepStrictEqual(startEndData(spans), [[0, 11, undefined]]);
        });

        it("'document-start' should create zero-length span at position 0", () => {
            const spans = generateSpans('Hello world', spansFrom('document-start'));
            deepStrictEqual(startEndData(spans), [[0, 0, undefined]]);
        });

        it("'document-end' should create zero-length span at end of content", () => {
            const spans = generateSpans('Hello world', spansFrom('document-end'));
            deepStrictEqual(startEndData(spans), [[11, 11, undefined]]);
        });
    });

    it('should work with generator function', () => {
        const result = generateSpans(
            'Hello world',
            spansFrom(function*() {
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
        const result = generateSpans(
            'test',
            spansFrom(function*(document, options) {
                yield[0, 4, { document, options }];
            }),
            { renderOptions: { render: 'options' } }
        );

        deepStrictEqual(startEndData(result), [
            [0, 4, { document: 'test', options: { render: 'options' } }]
        ]);
    });

    it('should work with function returning array', () => {
        const result = generateSpans(
            'Hello world',
            spansFrom<any>((document, renderOptions) => [
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

    it('should work with function returning GenerateSpans', () => {
        const result = generateSpans(
            'Hello world',
            spansFrom(() => (document, createSpan, context) => {
                createSpan(0, 5);
                createSpan(6, 11, { test: document, renderOptions: context?.renderOptions });
            }),
            { renderOptions: { someOption: true } }
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, { test: 'Hello world', renderOptions: { someOption: true } }]
        ]);
    });

    it('should work with array of spans', () => {
        const result = generateSpans(
            'Hello world',
            spansFrom([
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
        const result = renderSpans(
            'Hello world',
            spansFrom(new Set([[0, 5], [6, 11]]))
        );

        deepStrictEqual(result, ['Hello', 'world']);
    });

    it('should handle empty generator', () => {
        const result = generateSpans(
            'Hello world',
            spansFrom(function*() {
                // No yields
            })
        );

        deepStrictEqual(startEndData(result), []);
    });

    it('should handle empty array', () => {
        const result = renderSpans(
            'Hello world',
            spansFrom([])
        );

        deepStrictEqual(result, []);
    });
});

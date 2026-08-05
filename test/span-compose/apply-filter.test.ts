import { deepStrictEqual } from 'assert';
import { applyFilter, generateSpans } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyFilter', () => {
    it('should filter spans by data property', () => {
        const input = [
            { start: 0, end: 5, data: { type: 'keyword' } },
            { start: 6, end: 11, data: { type: 'string' } },
            { start: 12, end: 17, data: { type: 'keyword' } }
        ];

        const spans = generateSpans(
            'const value = "test"',
            applyFilter<{ type: string }, unknown>((span) => span.data?.type === 'keyword')(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { type: 'keyword' }],
            [12, 17, { type: 'keyword' }]
        ]);
    });

    it('should filter by position', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 10, end: 15 },
            { start: 20, end: 25 }
        ];

        const spans = generateSpans('hello world testing here', applyFilter((span) => span.start >= 10)(input));

        deepStrictEqual(startEndData(spans), [[10, 15, undefined], [20, 25, undefined]]);
    });

    it('should return empty when no matches', () => {
        const input = [
            { start: 0, end: 5, data: { type: 'keyword' } },
            { start: 6, end: 11, data: { type: 'string' } }
        ];

        const spans = generateSpans(
            'const value',
            applyFilter<{ type: string }, unknown>((span) => span.data?.type === 'number')(input)
        );

        deepStrictEqual(spans, []);
    });

    it('should handle empty input', () => {
        const spans = generateSpans('test', applyFilter(() => true)([]));
        deepStrictEqual(spans, []);
    });

    it('should use index parameter', () => {
        const input = [
            { start: 0, end: 1, data: 0 },
            { start: 1, end: 2, data: 1 },
            { start: 2, end: 3, data: 2 },
            { start: 3, end: 4, data: 3 }
        ];

        const spans = generateSpans('abcd', applyFilter((span, { index }) => index % 2 === 0)(input));

        deepStrictEqual(startEndData(spans), [[0, 1, 0], [2, 3, 2]]);
    });

    it('should access document from context', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11 }
        ];

        const spans = generateSpans('Hello World', applyFilter((span, { document }) => {
            return document.slice(span.start, span.end) === 'Hello';
        })(input));

        deepStrictEqual(startEndData(spans), [[0, 5, undefined]]);
    });

    it('should access lines helper from context', () => {
        const input = [
            { start: 0, end: 5, data: 'line1' },
            { start: 6, end: 11, data: 'line2' },
            { start: 12, end: 17, data: 'line3' }
        ];

        const spans = generateSpans('line1\nline2\nline3', applyFilter((span, { lines }) => {
            return lines.getLine(span.start) === 2;
        })(input));

        deepStrictEqual(startEndData(spans), [[6, 11, 'line2']]);
    });

    it('should access renderOptions from context', () => {
        interface RenderOpts {
            showHidden?: boolean;
        }

        const input = [
            { start: 0, end: 5, data: { visible: true } },
            { start: 6, end: 11, data: { visible: false } },
            { start: 12, end: 17, data: { visible: true } }
        ];

        const spans = generateSpans(
            'hello world test',
            applyFilter<{ visible: boolean }, RenderOpts>((span, { renderOptions }) => {
                if (renderOptions?.showHidden) {
                    return true;
                }
                return span.data?.visible === true;
            })(input),
            { renderOptions: { showHidden: false } }
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { visible: true }],
            [12, 17, { visible: true }]
        ]);
    });

    it('should preserve origin', () => {
        const origin = { start: 100, end: 200, data: 'original' };
        const input = [
            { start: 0, end: 5, data: 'a', origin },
            { start: 6, end: 11, data: 'b', origin }
        ];

        const spans = generateSpans('hello world', applyFilter((span) => span.data === 'a')(input));

        deepStrictEqual(startEndData(spans), [[0, 5, 'a']]);
        deepStrictEqual(spans[0].origin, origin);
    });

    it('should filter by span length', () => {
        const input = [
            { start: 0, end: 3, data: 'short' },
            { start: 4, end: 14, data: 'long' },
            { start: 15, end: 26, data: 'medium' }
        ];

        const spans = generateSpans('foo hello world and something else', applyFilter((span) => (span.end - span.start) > 5)(input));

        deepStrictEqual(startEndData(spans), [
            [4, 14, 'long'],
            [15, 26, 'medium']
        ]);
    });

    it('should handle undefined data', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11, data: 'defined' }
        ];

        const spans = generateSpans('hello world', applyFilter((span) => span.data !== undefined)(input));

        deepStrictEqual(startEndData(spans), [[6, 11, 'defined']]);
    });

    it('should handle zero-width spans', () => {
        const input = [
            { start: 0, end: 0, data: 'zero' },
            { start: 5, end: 5, data: 'zero' },
            { start: 3, end: 8, data: 'normal' }
        ];

        const spans = generateSpans('hello world', applyFilter((span) => span.start === span.end)(input));

        deepStrictEqual(startEndData(spans), [
            [0, 0, 'zero'],
            [5, 5, 'zero']
        ]);
    });
});

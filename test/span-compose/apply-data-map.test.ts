import { deepStrictEqual } from 'assert';
import { applyDataMap, generateSpans } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyDataMap', () => {
    it('should transform data while preserving positions', () => {
        const input = [
            { start: 0, end: 5, data: 1 },
            { start: 6, end: 11, data: 2 },
            { start: 12, end: 17, data: 3 }
        ];

        const spans = generateSpans(
            'hello world test',
            applyDataMap<number, number, unknown>((span) => (span.data ?? 0) * 2)(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 2],
            [6, 11, 4],
            [12, 17, 6]
        ]);
    });

    it('should transform data to different type', () => {
        const input = [
            { start: 0, end: 5, data: 'keyword' },
            { start: 6, end: 11, data: 'string' }
        ];

        const spans = generateSpans('hello world', applyDataMap((span) => ({ type: span.data, highlighted: true }))(input));

        deepStrictEqual(startEndData(spans), [
            [0, 5, { type: 'keyword', highlighted: true }],
            [6, 11, { type: 'string', highlighted: true }]
        ]);
    });

    it('should handle empty input', () => {
        const spans = generateSpans('test', applyDataMap((span) => span.data)([]));

        deepStrictEqual(spans, []);
    });

    it('should transform undefined data', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11 }
        ];

        const spans = generateSpans('hello world', applyDataMap((span) => ({ value: span.data, hasData: span.data !== undefined }))(input));

        deepStrictEqual(startEndData(spans), [
            [0, 5, { value: undefined, hasData: false }],
            [6, 11, { value: undefined, hasData: false }]
        ]);
    });

    it('should access span start and end in mapper', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 10, end: 20, data: 'b' },
            { start: 25, end: 30, data: 'c' }
        ];

        const spans = generateSpans(
            'some longer text for testing',
            applyDataMap((span) => ({ original: span.data, length: span.end - span.start }))(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { original: 'a', length: 5 }],
            [10, 20, { original: 'b', length: 10 }],
            [25, 30, { original: 'c', length: 5 }]
        ]);
    });

    it('should provide correct index to mapper', () => {
        const input = [
            { start: 0, end: 1, data: 'a' },
            { start: 1, end: 2, data: 'b' },
            { start: 2, end: 3, data: 'c' }
        ];

        const spans = generateSpans('abc', applyDataMap((span, { index }) => ({ char: span.data, index }))(input));

        deepStrictEqual(startEndData(spans), [
            [0, 1, { char: 'a', index: 0 }],
            [1, 2, { char: 'b', index: 1 }],
            [2, 3, { char: 'c', index: 2 }]
        ]);
    });

    it('should access document text via context', () => {
        const input = [
            { start: 0, end: 5, data: {} },
            { start: 6, end: 11, data: {} }
        ];

        type Data = object;
        type NewData = { text: string };
        const spans = generateSpans(
            'Hello World',
            applyDataMap<Data, NewData, unknown>((span, { document }) => ({
                ...span.data,
                text: document.slice(span.start, span.end)
            }))(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { text: 'Hello' }],
            [6, 11, { text: 'World' }]
        ]);
    });

    it('should use lines helper from context', () => {
        const input = [
            { start: 0, end: 5, data: { text: 'line1' } },
            { start: 6, end: 11, data: { text: 'line2' } },
            { start: 12, end: 17, data: { text: 'line3' } }
        ];

        type Data = { text: string };
        type NewData = { text: string; line: number; column: number };
        const spans = generateSpans(
            'line1\nline2\nline3',
            applyDataMap<Data, NewData, unknown>((span, { lines }) => ({
                text: span.data?.text || '',
                line: lines.getLine(span.start),
                column: lines.getColumn(span.start)
            }))(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { text: 'line1', line: 1, column: 1 }],
            [6, 11, { text: 'line2', line: 2, column: 1 }],
            [12, 17, { text: 'line3', line: 3, column: 1 }]
        ]);
    });

    it('should access all spans in context', () => {
        const input = [
            { start: 0, end: 5, data: { value: 10 } },
            { start: 6, end: 11, data: { value: 20 } },
            { start: 12, end: 17, data: { value: 30 } }
        ];

        type Data = { value: number };
        type NewData = { value: number; total: number };
        const spans = generateSpans(
            'hello world test',
            applyDataMap<Data, NewData, unknown>((span, { spans }) => {
                const total = spans.reduce((sum: number, r) => sum + (r.data?.value || 0), 0);
                return { value: span.data?.value || 0, total };
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { value: 10, total: 60 }],
            [6, 11, { value: 20, total: 60 }],
            [12, 17, { value: 30, total: 60 }]
        ]);
    });

    it('should use renderOptions from context', () => {
        interface RenderOpts {
            theme: string;
        }

        const input = [
            { start: 0, end: 5, data: { type: 'A' } },
            { start: 6, end: 11, data: { type: 'B' } }
        ];

        const spans = generateSpans(
            'hello world',
            applyDataMap<any, any, RenderOpts>((span, { renderOptions }) => ({
                ...span.data,
                theme: renderOptions?.theme || 'default'
            }))(input),
            { renderOptions: { theme: 'dark' } }
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { type: 'A', theme: 'dark' }],
            [6, 11, { type: 'B', theme: 'dark' }]
        ]);
    });

    it('should not preserve origin after data transformation', () => {
        const input = [
            { start: 0, end: 5, data: 1, origin: { start: 0, end: 5, data: 1 } },
            { start: 6, end: 11, data: 2, origin: { start: 6, end: 11, data: 2 } }
        ];

        type Data = number;
        type NewData = { value: number };
        const spans = generateSpans(
            'hello world',
            applyDataMap<Data, NewData, unknown>((span) => ({ value: (span.data ?? 0) * 10 }))(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, { value: 10 }],
            [6, 11, { value: 20 }]
        ]);
    });
});

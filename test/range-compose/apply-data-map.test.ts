import { deepStrictEqual } from 'assert';
import { applyDataMap, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyDataMap', () => {
    it('should transform data while preserving positions', () => {
        const input = [
            { start: 0, end: 5, data: 1 },
            { start: 6, end: 11, data: 2 },
            { start: 12, end: 17, data: 3 }
        ];

        const ranges = generateRanges(
            'hello world test',
            applyDataMap<number, number, unknown>((range) => (range.data ?? 0) * 2)(input)
        );

        deepStrictEqual(startEndData(ranges), [
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

        const ranges = generateRanges('hello world', applyDataMap((range) => ({ type: range.data, highlighted: true }))(input));

        deepStrictEqual(startEndData(ranges), [
            [0, 5, { type: 'keyword', highlighted: true }],
            [6, 11, { type: 'string', highlighted: true }]
        ]);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges('test', applyDataMap((range) => range.data)([]));

        deepStrictEqual(ranges, []);
    });

    it('should transform undefined data', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11 }
        ];

        const ranges = generateRanges('hello world', applyDataMap((range) => ({ value: range.data, hasData: range.data !== undefined }))(input));

        deepStrictEqual(startEndData(ranges), [
            [0, 5, { value: undefined, hasData: false }],
            [6, 11, { value: undefined, hasData: false }]
        ]);
    });

    it('should access range start and end in mapper', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 10, end: 20, data: 'b' },
            { start: 25, end: 30, data: 'c' }
        ];

        const ranges = generateRanges(
            'some longer text for testing',
            applyDataMap((range) => ({ original: range.data, length: range.end - range.start }))(input)
        );

        deepStrictEqual(startEndData(ranges), [
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

        const ranges = generateRanges('abc', applyDataMap((range, { index }) => ({ char: range.data, index }))(input));

        deepStrictEqual(startEndData(ranges), [
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
        const ranges = generateRanges(
            'Hello World',
            applyDataMap<Data, NewData, unknown>((range, { document }) => ({
                ...range.data,
                text: document.slice(range.start, range.end)
            }))(input)
        );

        deepStrictEqual(startEndData(ranges), [
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
        const ranges = generateRanges(
            'line1\nline2\nline3',
            applyDataMap<Data, NewData, unknown>((range, { lines }) => ({
                text: range.data?.text || '',
                line: lines.getLine(range.start),
                column: lines.getColumn(range.start)
            }))(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, { text: 'line1', line: 1, column: 1 }],
            [6, 11, { text: 'line2', line: 2, column: 1 }],
            [12, 17, { text: 'line3', line: 3, column: 1 }]
        ]);
    });

    it('should access all ranges in context', () => {
        const input = [
            { start: 0, end: 5, data: { value: 10 } },
            { start: 6, end: 11, data: { value: 20 } },
            { start: 12, end: 17, data: { value: 30 } }
        ];

        type Data = { value: number };
        type NewData = { value: number; total: number };
        const ranges = generateRanges(
            'hello world test',
            applyDataMap<Data, NewData, unknown>((range, { ranges }) => {
                const total = ranges.reduce((sum: number, r) => sum + (r.data?.value || 0), 0);
                return { value: range.data?.value || 0, total };
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
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

        const ranges = generateRanges(
            'hello world',
            applyDataMap<any, any, RenderOpts>((range, { renderOptions }) => ({
                ...range.data,
                theme: renderOptions?.theme || 'default'
            }))(input),
            { renderOptions: { theme: 'dark' } }
        );

        deepStrictEqual(startEndData(ranges), [
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
        const ranges = generateRanges(
            'hello world',
            applyDataMap<Data, NewData, unknown>((range) => ({ value: (range.data ?? 0) * 10 }))(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, { value: 10 }],
            [6, 11, { value: 20 }]
        ]);
    });
});

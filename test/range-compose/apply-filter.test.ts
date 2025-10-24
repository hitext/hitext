import { deepStrictEqual } from 'assert';
import { applyFilter, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyFilter', () => {
    it('should filter ranges by data property', () => {
        const input = [
            { start: 0, end: 5, data: { type: 'keyword' } },
            { start: 6, end: 11, data: { type: 'string' } },
            { start: 12, end: 17, data: { type: 'keyword' } }
        ];

        const ranges = generateRanges(
            'const value = "test"',
            applyFilter<{ type: string }, unknown>((range) => range.data?.type === 'keyword')(input)
        );

        deepStrictEqual(startEndData(ranges), [
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

        const ranges = generateRanges('hello world testing here', applyFilter((range) => range.start >= 10)(input));

        deepStrictEqual(startEndData(ranges), [[10, 15, undefined], [20, 25, undefined]]);
    });

    it('should return empty when no matches', () => {
        const input = [
            { start: 0, end: 5, data: { type: 'keyword' } },
            { start: 6, end: 11, data: { type: 'string' } }
        ];

        const ranges = generateRanges(
            'const value',
            applyFilter<{ type: string }, unknown>((range) => range.data?.type === 'number')(input)
        );

        deepStrictEqual(ranges, []);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges('test', applyFilter(() => true)([]));
        deepStrictEqual(ranges, []);
    });

    it('should use index parameter', () => {
        const input = [
            { start: 0, end: 1, data: 0 },
            { start: 1, end: 2, data: 1 },
            { start: 2, end: 3, data: 2 },
            { start: 3, end: 4, data: 3 }
        ];

        const ranges = generateRanges('abcd', applyFilter((range, { index }) => index % 2 === 0)(input));

        deepStrictEqual(startEndData(ranges), [[0, 1, 0], [2, 3, 2]]);
    });

    it('should access document from context', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11 }
        ];

        const ranges = generateRanges('Hello World', applyFilter((range, { document }) => {
            return document.slice(range.start, range.end) === 'Hello';
        })(input));

        deepStrictEqual(startEndData(ranges), [[0, 5, undefined]]);
    });

    it('should access lines helper from context', () => {
        const input = [
            { start: 0, end: 5, data: 'line1' },
            { start: 6, end: 11, data: 'line2' },
            { start: 12, end: 17, data: 'line3' }
        ];

        const ranges = generateRanges('line1\nline2\nline3', applyFilter((range, { lines }) => {
            return lines.getLine(range.start) === 2;
        })(input));

        deepStrictEqual(startEndData(ranges), [[6, 11, 'line2']]);
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

        const ranges = generateRanges(
            'hello world test',
            applyFilter<{ visible: boolean }, RenderOpts>((range, { renderOptions }) => {
                if (renderOptions?.showHidden) {
                    return true;
                }
                return range.data?.visible === true;
            })(input),
            { renderOptions: { showHidden: false } }
        );

        deepStrictEqual(startEndData(ranges), [
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

        const ranges = generateRanges('hello world', applyFilter((range) => range.data === 'a')(input));

        deepStrictEqual(startEndData(ranges), [[0, 5, 'a']]);
        deepStrictEqual(ranges[0].origin, origin);
    });

    it('should filter by range length', () => {
        const input = [
            { start: 0, end: 3, data: 'short' },
            { start: 4, end: 14, data: 'long' },
            { start: 15, end: 26, data: 'medium' }
        ];

        const ranges = generateRanges('foo hello world and something else', applyFilter((range) => (range.end - range.start) > 5)(input));

        deepStrictEqual(startEndData(ranges), [
            [4, 14, 'long'],
            [15, 26, 'medium']
        ]);
    });

    it('should handle undefined data', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11, data: 'defined' }
        ];

        const ranges = generateRanges('hello world', applyFilter((range) => range.data !== undefined)(input));

        deepStrictEqual(startEndData(ranges), [[6, 11, 'defined']]);
    });

    it('should handle zero-width ranges', () => {
        const input = [
            { start: 0, end: 0, data: 'zero' },
            { start: 5, end: 5, data: 'zero' },
            { start: 3, end: 8, data: 'normal' }
        ];

        const ranges = generateRanges('hello world', applyFilter((range) => range.start === range.end)(input));

        deepStrictEqual(startEndData(ranges), [
            [0, 0, 'zero'],
            [5, 5, 'zero']
        ]);
    });
});

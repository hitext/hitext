import { deepStrictEqual } from 'assert';
import { applySort, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applySort', () => {
    it('should sort by start position ascending (default)', () => {
        const input = [
            { start: 20, end: 25, data: 'third' },
            { start: 0, end: 5, data: 'first' },
            { start: 10, end: 15, data: 'second' }
        ];
        const ranges = generateRanges('Hello world', applySort()(input));
        deepStrictEqual(startEndData(ranges), [[0, 5, 'first'], [10, 15, 'second'], [20, 25, 'third']]);
    });

    it('should sort by end position descending when starts are equal (default)', () => {
        const input = [
            { start: 0, end: 5, data: 'short' },
            { start: 0, end: 15, data: 'long' },
            { start: 0, end: 10, data: 'medium' }
        ];
        const ranges = generateRanges('Hello world', applySort()(input));
        deepStrictEqual(startEndData(ranges), [[0, 15, 'long'], [0, 10, 'medium'], [0, 5, 'short']]);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges('test', applySort()([]));
        deepStrictEqual(ranges, []);
    });

    it('should sort by end position with custom comparator', () => {
        const input = [
            { start: 0, end: 15, data: 'c' },
            { start: 0, end: 5, data: 'a' },
            { start: 0, end: 10, data: 'b' }
        ];
        const ranges = generateRanges('Hello world', applySort((a, b) => a.end - b.end)(input));
        deepStrictEqual(ranges.map(r => r.data), ['a', 'b', 'c']);
    });

    it('should sort by data property', () => {
        const input = [
            { start: 0, end: 5, data: { priority: 3 } },
            { start: 6, end: 11, data: { priority: 1 } },
            { start: 12, end: 17, data: { priority: 2 } }
        ];
        const ranges = generateRanges(
            'Hello world',
            applySort<{ priority: number }, unknown>((a, b) => a.data!.priority - b.data!.priority)(input)
        );
        deepStrictEqual(ranges.map(r => r.data!.priority), [1, 2, 3]);
    });

    it('should sort by range length', () => {
        const input = [
            { start: 0, end: 5, data: 'medium' },
            { start: 6, end: 16, data: 'long' },
            { start: 17, end: 19, data: 'short' }
        ];
        const ranges = generateRanges(
            'Hello world',
            applySort((a, b) => (a.end - a.start) - (b.end - b.start))(input)
        );
        deepStrictEqual(ranges.map(r => r.data), ['short', 'medium', 'long']);
    });

    it('should sort by line number using context', () => {
        const input = [
            { start: 12, end: 17, data: 'line3' },
            { start: 0, end: 5, data: 'line1' },
            { start: 6, end: 11, data: 'line2' }
        ];
        const ranges = generateRanges(
            'line1\nline2\nline3',
            applySort((a, b, { lines }) => lines.getLine(a.start) - lines.getLine(b.start))(input)
        );
        deepStrictEqual(ranges.map(r => r.data), ['line1', 'line2', 'line3']);
    });

    it('should access source in comparator', () => {
        const input = [
            { start: 0, end: 3, data: 'num' },
            { start: 4, end: 9, data: 'word' },
            { start: 10, end: 13, data: 'num' }
        ];
        const ranges = generateRanges(
            '123 hello 456',
            applySort((a, b, { source: src }) => {
                const isNumA = /^\d+$/.test(src.slice(a.start, a.end));
                const isNumB = /^\d+$/.test(src.slice(b.start, b.end));
                return isNumA && !isNumB ? -1 : !isNumA && isNumB ? 1 : 0;
            })(input)
        );
        deepStrictEqual(ranges.map(r => r.data), ['num', 'num', 'word']);
    });

    it('should preserve origin through sorting', () => {
        const origin1 = { start: 100, end: 105, data: 'orig1' };
        const origin2 = { start: 200, end: 205, data: 'orig2' };
        const input = [
            { start: 10, end: 15, data: 'b', origin: origin2 },
            { start: 0, end: 5, data: 'a', origin: origin1 }
        ];
        const ranges = generateRanges('Hello world', applySort()(input));
        deepStrictEqual(ranges[0].origin, origin1);
        deepStrictEqual(ranges[1].origin, origin2);
    });

    it('should sort by multiple criteria', () => {
        const input = [
            { start: 0, end: 10, data: { type: 'b', priority: 1 } },
            { start: 0, end: 5, data: { type: 'a', priority: 2 } },
            { start: 0, end: 10, data: { type: 'a', priority: 1 } }
        ];
        const ranges = generateRanges(
            'Hello world',
            applySort<{ type: string; priority: number }, unknown>((a, b) => {
                const typeCompare = (a.data!.type || '').localeCompare(b.data!.type || '');
                return typeCompare !== 0 ? typeCompare : a.data!.priority - b.data!.priority;
            })(input)
        );
        deepStrictEqual(ranges.map(r => r.data), [
            { type: 'a', priority: 1 },
            { type: 'a', priority: 2 },
            { type: 'b', priority: 1 }
        ]);
    });
});

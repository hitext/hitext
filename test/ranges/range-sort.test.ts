import { deepStrictEqual, strictEqual } from 'assert';
import { rangeSort, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeSort', () => {
    describe('Default sorting', () => {
        it('should sort by start position ascending', () => {
            const input = [
                { start: 20, end: 25, data: 'third' },
                { start: 0, end: 5, data: 'first' },
                { start: 10, end: 15, data: 'second' }
            ];

            const source = 'a'.repeat(30);
            const ranges = generateRanges(source, rangeSort(input));

            deepStrictEqual(startEndData(ranges), [
                [0, 5, 'first'],
                [10, 15, 'second'],
                [20, 25, 'third']
            ]);
        });

        it('should sort by end position descending when starts are equal', () => {
            const input = [
                { start: 0, end: 5, data: 'short' },
                { start: 0, end: 15, data: 'long' },
                { start: 0, end: 10, data: 'medium' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(source, rangeSort(input));

            deepStrictEqual(startEndData(ranges), [
                [0, 15, 'long'],
                [0, 10, 'medium'],
                [0, 5, 'short']
            ]);
        });

        it('should handle empty input', () => {
            const source = 'test';
            const ranges = generateRanges(source, rangeSort([]));

            deepStrictEqual(ranges, []);
        });

        it('should handle single range', () => {
            const input = [{ start: 0, end: 5, data: 'only' }];
            const source = 'a'.repeat(10);
            const ranges = generateRanges(source, rangeSort(input));

            strictEqual(ranges.length, 1);
            deepStrictEqual(startEndData(ranges), [[0, 5, 'only']]);
        });
    });

    describe('Custom comparators', () => {
        it('should sort by end position ascending', () => {
            const input = [
                { start: 0, end: 15, data: 'c' },
                { start: 0, end: 5, data: 'a' },
                { start: 0, end: 10, data: 'b' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b) => a.end - b.end)
            );

            deepStrictEqual(ranges.map(r => r.data), ['a', 'b', 'c']);
        });

        it('should sort by data property', () => {
            const input = [
                { start: 0, end: 5, data: { priority: 3 } },
                { start: 6, end: 11, data: { priority: 1 } },
                { start: 12, end: 17, data: { priority: 2 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b) => a.data!.priority - b.data!.priority)
            );

            deepStrictEqual(ranges.map(r => r.data!.priority), [1, 2, 3]);
        });

        it('should sort by range length', () => {
            const input = [
                { start: 0, end: 5, data: 'medium' },
                { start: 6, end: 16, data: 'long' },
                { start: 17, end: 19, data: 'short' }
            ];

            const source = 'a'.repeat(25);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b) => (a.end - a.start) - (b.end - b.start))
            );

            deepStrictEqual(ranges.map(r => r.data), ['short', 'medium', 'long']);
        });
    });

    describe('Sorting with context', () => {
        it('should sort by line number', () => {
            const input = [
                { start: 12, end: 17, data: 'line3' },  // line 3
                { start: 0, end: 5, data: 'line1' },    // line 1
                { start: 6, end: 11, data: 'line2' }    // line 2
            ];

            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b, { lines }) =>
                    lines.getLine(a.start) - lines.getLine(b.start)
                )
            );

            deepStrictEqual(ranges.map(r => r.data), ['line1', 'line2', 'line3']);
        });

        it('should access source in comparator', () => {
            const input = [
                { start: 0, end: 3, data: 'num' },
                { start: 4, end: 9, data: 'word' },
                { start: 10, end: 13, data: 'num' }
            ];

            const source = '123 hello 456';
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b, { source: src }) => {
                    const textA = src.slice(a.start, a.end);
                    const textB = src.slice(b.start, b.end);
                    // Numbers before words
                    const isNumA = /^\d+$/.test(textA);
                    const isNumB = /^\d+$/.test(textB);
                    if (isNumA && !isNumB) {
                        return -1;
                    }
                    if (!isNumA && isNumB) {
                        return 1;
                    }
                    return 0;
                })
            );

            deepStrictEqual(ranges.map(r => r.data), ['num', 'num', 'word']);
        });

        it('should access all ranges in comparator', () => {
            const input = [
                { start: 0, end: 5, data: { value: 10 } },
                { start: 6, end: 11, data: { value: 30 } },
                { start: 12, end: 17, data: { value: 20 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b, { ranges }) => {
                    // Sort by distance from average
                    const avg = ranges.reduce((sum, r) => sum + (r.data?.value || 0), 0) / ranges.length;
                    const distA = Math.abs((a.data?.value || 0) - avg);
                    const distB = Math.abs((b.data?.value || 0) - avg);
                    return distA - distB;
                })
            );

            // Average is 20, so order: 20 (dist 0), 10 (dist 10), 30 (dist 10)
            deepStrictEqual(ranges.map(r => r.data!.value), [20, 10, 30]);
        });
    });

    describe('Origin preservation', () => {
        it('should preserve origin through sorting', () => {
            const origin1 = { start: 100, end: 105, data: 'orig1' };
            const origin2 = { start: 200, end: 205, data: 'orig2' };
            const input = [
                { start: 10, end: 15, data: 'b', origin: origin2 },
                { start: 0, end: 5, data: 'a', origin: origin1 }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(source, rangeSort(input));

            strictEqual(ranges.length, 2);
            deepStrictEqual(ranges[0].origin, origin1);
            deepStrictEqual(ranges[1].origin, origin2);
        });

        it('should handle ranges without origin', () => {
            const input = [
                { start: 10, end: 15, data: 'b' },
                { start: 0, end: 5, data: 'a' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(source, rangeSort(input));

            strictEqual(ranges[0].origin, undefined);
            strictEqual(ranges[1].origin, undefined);
        });
    });

    describe('Complex sorting scenarios', () => {
        it('should sort by multiple criteria', () => {
            const input = [
                { start: 0, end: 10, data: { type: 'b', priority: 1 } },
                { start: 0, end: 5, data: { type: 'a', priority: 2 } },
                { start: 0, end: 10, data: { type: 'a', priority: 1 } }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b) => {
                    // Sort by type first, then priority
                    const typeCompare = (a.data!.type || '').localeCompare(b.data!.type || '');
                    if (typeCompare !== 0) {
                        return typeCompare;
                    }
                    return a.data!.priority - b.data!.priority;
                })
            );

            deepStrictEqual(ranges.map(r => r.data), [
                { type: 'a', priority: 1 },
                { type: 'a', priority: 2 },
                { type: 'b', priority: 1 }
            ]);
        });

        it('should handle stable sort', () => {
            const input = [
                { start: 0, end: 5, data: { value: 1, id: 'a' } },
                { start: 6, end: 11, data: { value: 1, id: 'b' } },
                { start: 12, end: 17, data: { value: 1, id: 'c' } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b) => a.data!.value - b.data!.value)
            );

            // Should maintain original order when values are equal (stable sort)
            deepStrictEqual(ranges.map(r => r.data!.id), ['a', 'b', 'c']);
        });

        it('should sort overlapping ranges', () => {
            const input = [
                { start: 5, end: 15, data: 'overlap' },
                { start: 0, end: 10, data: 'outer' },
                { start: 3, end: 7, data: 'inner' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeSort(input) // Default sort
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 10, 'outer'],
                [3, 7, 'inner'],
                [5, 15, 'overlap']
            ]);
        });

        it('should handle zero-width ranges', () => {
            const input = [
                { start: 5, end: 5, data: 'cursor2' },
                { start: 0, end: 0, data: 'cursor1' },
                { start: 0, end: 5, data: 'selection' }
            ];

            const source = 'a'.repeat(10);
            const ranges = generateRanges(source, rangeSort(input));

            deepStrictEqual(startEndData(ranges), [
                [0, 5, 'selection'],
                [0, 0, 'cursor1'],
                [5, 5, 'cursor2']
            ]);
        });
    });

    describe('Edge cases', () => {
        it('should handle ranges with undefined data', () => {
            const input = [
                { start: 10, end: 15 },
                { start: 0, end: 5 }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(source, rangeSort(input));

            deepStrictEqual(startEndData(ranges), [
                [0, 5, undefined],
                [10, 15, undefined]
            ]);
        });

        it('should handle all ranges at same position', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 0, end: 5, data: 'b' },
                { start: 0, end: 5, data: 'c' }
            ];

            const source = 'a'.repeat(10);
            const ranges = generateRanges(source, rangeSort(input));

            deepStrictEqual(startEndData(ranges), [
                [0, 5, 'a'],
                [0, 5, 'b'],
                [0, 5, 'c']
            ]);
        });

        it('should handle mixed positive and negative data values', () => {
            const input = [
                { start: 0, end: 5, data: 10 },
                { start: 6, end: 11, data: -5 },
                { start: 12, end: 17, data: 0 }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeSort(input, (a, b) => (a.data || 0) - (b.data || 0))
            );

            deepStrictEqual(startEndData(ranges), [
                [6, 11, -5],
                [12, 17, 0],
                [0, 5, 10]
            ]);
        });
    });
});

import { deepStrictEqual, strictEqual } from 'assert';
import { rangeFilter, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeFilter', () => {
    describe('Basic filtering', () => {
        it('should filter ranges by data property', () => {
            const input = [
                { start: 0, end: 5, data: { type: 'keyword' } },
                { start: 6, end: 11, data: { type: 'string' } },
                { start: 12, end: 17, data: { type: 'keyword' } }
            ];

            const source = 'const value = "test"';
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range) => range.data!.type === 'keyword')
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 5, { type: 'keyword' }],
                [12, 17, { type: 'keyword' }]
            ]);
        });

        it('should filter ranges by position', () => {
            const input = [
                { start: 0, end: 5 },
                { start: 10, end: 15 },
                { start: 20, end: 25 }
            ];

            const source = 'a'.repeat(30);
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range) => range.start >= 10)
            );

            deepStrictEqual(startEndData(ranges), [
                [10, 15, undefined],
                [20, 25, undefined]
            ]);
        });

        it('should return empty array when no ranges match', () => {
            const input = [
                { start: 0, end: 5, data: { type: 'keyword' } },
                { start: 6, end: 11, data: { type: 'string' } }
            ];

            const source = 'const value';
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range) => range.data!.type === 'number')
            );

            deepStrictEqual(ranges, []);
        });

        it('should handle empty input', () => {
            const source = 'test';
            const ranges = generateRanges(
                source,
                rangeFilter([], () => true)
            );

            deepStrictEqual(ranges, []);
        });

        it('should preserve all ranges when predicate always returns true', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 6, end: 11, data: 'b' },
                { start: 12, end: 17, data: 'c' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeFilter(input, () => true)
            );

            strictEqual(ranges.length, 3);
            deepStrictEqual(startEndData(ranges), [
                [0, 5, 'a'],
                [6, 11, 'b'],
                [12, 17, 'c']
            ]);
        });
    });

    describe('Index usage', () => {
        it('should provide correct index to predicate', () => {
            const input = [
                { start: 0, end: 1, data: 0 },
                { start: 1, end: 2, data: 1 },
                { start: 2, end: 3, data: 2 },
                { start: 3, end: 4, data: 3 }
            ];

            const source = 'abcd';
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range, index) => index % 2 === 0)
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 1, 0],
                [2, 3, 2]
            ]);
        });

        it('should filter even/odd indices correctly', () => {
            const input = Array.from({ length: 10 }, (_, i) => ({
                start: i,
                end: i + 1,
                data: i
            }));

            const source = 'a'.repeat(11);
            const evenRanges = generateRanges(
                source,
                rangeFilter(input, (range, index) => index % 2 === 0)
            );

            strictEqual(evenRanges.length, 5);
            deepStrictEqual(evenRanges.map(r => r.data), [0, 2, 4, 6, 8]);
        });
    });

    describe('Context access', () => {
        it('should provide source in context', () => {
            const input = [
                { start: 0, end: 5 },
                { start: 6, end: 11 }
            ];

            const source = 'Hello World';
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range, index, { source: src }) => {
                    const text = src.slice(range.start, range.end);
                    return text === 'Hello';
                })
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(startEndData(ranges), [[0, 5, undefined]]);
        });

        it('should provide lines helper in context', () => {
            const input = [
                { start: 0, end: 5, data: 'line1' },
                { start: 6, end: 11, data: 'line2' },
                { start: 12, end: 17, data: 'line3' }
            ];

            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range, index, { lines }) => {
                    return lines.getLine(range.start) === 2;
                })
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(startEndData(ranges), [[6, 11, 'line2']]);
        });

        it('should provide all ranges in context', () => {
            const input = [
                { start: 0, end: 5, data: { priority: 1 } },
                { start: 6, end: 11, data: { priority: 2 } },
                { start: 12, end: 17, data: { priority: 3 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range, index, { ranges }) => {
                    // Filter ranges with priority lower than the last range's priority
                    const lastRange = ranges[ranges.length - 1];
                    return range.data!.priority < lastRange.data!.priority;
                })
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(ranges.map(r => r.data!.priority), [1, 2]);
        });

        it('should provide renderOptions in context', () => {
            interface RenderOpts {
                showHidden?: boolean;
            }

            const input = [
                { start: 0, end: 5, data: { visible: true } },
                { start: 6, end: 11, data: { visible: false } },
                { start: 12, end: 17, data: { visible: true } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeFilter<{ visible: boolean }, RenderOpts>(input, (range, index, { renderOptions }) => {
                    if (renderOptions?.showHidden) {
                        return true;
                    }
                    return range.data!.visible;
                }),
                { renderOptions: { showHidden: false } }
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(ranges.map(r => (r.data as { visible: boolean }).visible), [true, true]);
        });
    });

    describe('Line-based filtering', () => {
        it('should filter ranges that span multiple lines', () => {
            const input = [
                { start: 0, end: 5, data: 'single' },      // line 1
                { start: 3, end: 8, data: 'multi' },       // lines 1-2
                { start: 6, end: 11, data: 'single' },     // line 2
                { start: 9, end: 14, data: 'multi' }       // lines 2-3
            ];

            const source = 'line1\nline2\nline3';
            const multiLine = generateRanges(
                source,
                rangeFilter(input, (range, index, { lines }) => {
                    return lines.getLine(range.start) !== lines.getLine(range.end - 1);
                })
            );

            strictEqual(multiLine.length, 2);
            deepStrictEqual(multiLine.map(r => r.data), ['multi', 'multi']);
        });

        it('should filter ranges on specific lines', () => {
            const input = [
                { start: 0, end: 3, data: 1 },    // line 1
                { start: 4, end: 7, data: 2 },    // line 2
                { start: 8, end: 11, data: 3 }    // line 3
            ];

            const source = 'aaa\nbbb\nccc';
            const line2Ranges = generateRanges(
                source,
                rangeFilter(input, (range, index, { lines }) => {
                    return lines.getLine(range.start) === 2;
                })
            );

            strictEqual(line2Ranges.length, 1);
            deepStrictEqual(startEndData(line2Ranges), [[4, 7, 2]]);
        });
    });

    describe('Origin preservation', () => {
        it('should preserve origin from input ranges', () => {
            const origin = { start: 100, end: 200, data: 'original' };
            const input = [
                { start: 0, end: 5, data: 'a', origin },
                { start: 6, end: 11, data: 'b', origin }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range) => range.data === 'a')
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(ranges[0].origin, origin);
        });

        it('should preserve origin through filtering', () => {
            const input = [
                { start: 0, end: 5, data: 1, origin: { start: 0, end: 5, data: 1 } },
                { start: 6, end: 11, data: 2, origin: { start: 6, end: 11, data: 2 } },
                { start: 12, end: 17, data: 3, origin: { start: 12, end: 17, data: 3 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range) => range.data! % 2 === 1)
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(ranges[0].origin, { start: 0, end: 5, data: 1 });
            deepStrictEqual(ranges[1].origin, { start: 12, end: 17, data: 3 });
        });
    });

    describe('Complex filtering scenarios', () => {
        it('should filter by range length', () => {
            const input = [
                { start: 0, end: 3, data: 'short' },
                { start: 4, end: 14, data: 'long' },
                { start: 15, end: 21, data: 'medium' }
            ];

            const source = 'a'.repeat(25);
            const longRanges = generateRanges(
                source,
                rangeFilter(input, (range) => (range.end - range.start) > 5)
            );

            strictEqual(longRanges.length, 2);
            deepStrictEqual(longRanges.map(r => r.data), ['long', 'medium']);
        });

        it('should filter using content analysis', () => {
            const input = [
                { start: 0, end: 3, data: 'num' },
                { start: 4, end: 9, data: 'word' },
                { start: 10, end: 13, data: 'num' }
            ];

            const source = '123 hello 456';
            const numericRanges = generateRanges(
                source,
                rangeFilter(input, (range, index, { source: src }) => {
                    const text = src.slice(range.start, range.end);
                    return /^\d+$/.test(text);
                })
            );

            strictEqual(numericRanges.length, 2);
            deepStrictEqual(numericRanges.map(r => r.data), ['num', 'num']);
        });

        it('should combine multiple filter conditions', () => {
            const input = [
                { start: 0, end: 5, data: { type: 'keyword', priority: 1 } },
                { start: 6, end: 11, data: { type: 'string', priority: 2 } },
                { start: 12, end: 17, data: { type: 'keyword', priority: 3 } },
                { start: 18, end: 23, data: { type: 'number', priority: 2 } }
            ];

            const source = 'a'.repeat(30);
            const filtered = generateRanges(
                source,
                rangeFilter(input, (range, index) => {
                    return range.data!.type === 'keyword' &&
                           range.data!.priority > 1 &&
                           index > 0;
                })
            );

            strictEqual(filtered.length, 1);
            deepStrictEqual(filtered[0].data, { type: 'keyword', priority: 3 });
        });
    });

    describe('Edge cases', () => {
        it('should handle ranges with undefined data', () => {
            const input = [
                { start: 0, end: 5 },
                { start: 6, end: 11, data: 'defined' }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeFilter(input, (range) => range.data !== undefined)
            );

            strictEqual(ranges.length, 1);
            deepStrictEqual(startEndData(ranges), [[6, 11, 'defined']]);
        });

        it('should handle zero-width ranges', () => {
            const input = [
                { start: 0, end: 0, data: 'zero' },
                { start: 5, end: 5, data: 'zero' },
                { start: 3, end: 8, data: 'normal' }
            ];

            const source = 'a'.repeat(10);
            const zeroWidth = generateRanges(
                source,
                rangeFilter(input, (range) => range.start === range.end)
            );

            strictEqual(zeroWidth.length, 2);
            deepStrictEqual(zeroWidth.map(r => r.data), ['zero', 'zero']);
        });

        it('should handle overlapping ranges', () => {
            const input = [
                { start: 0, end: 10, data: 'outer' },
                { start: 3, end: 7, data: 'inner' },
                { start: 5, end: 15, data: 'overlap' }
            ];

            const source = 'a'.repeat(20);
            const short = generateRanges(
                source,
                rangeFilter(input, (range) => (range.end - range.start) < 10)
            );

            strictEqual(short.length, 1);
            deepStrictEqual(short[0].data, 'inner');
        });
    });
});

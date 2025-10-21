import { strictEqual, deepStrictEqual } from 'assert';
import { rangePick, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangePick()', () => {
    describe('Basic picking', () => {
        it('should pick first range', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 6, end: 11, data: 'b' },
                { start: 12, end: 17, data: 'c' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(source, rangePick(input, 'first'));

            deepStrictEqual(startEndData(ranges), [[0, 5, 'a']]);
        });

        it('should pick last range', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 6, end: 11, data: 'b' },
                { start: 12, end: 17, data: 'c' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(source, rangePick(input, 'last'));

            deepStrictEqual(startEndData(ranges), [[12, 17, 'c']]);
        });

        it('should return empty when input is empty', () => {
            const source = 'test';
            const ranges = generateRanges(source, rangePick([], 'first'));

            strictEqual(ranges.length, 0);
        });

        it('should work with single range', () => {
            const input = [{ start: 0, end: 5, data: 'only' }];
            const source = 'a'.repeat(10);

            const first = generateRanges(source, rangePick(input, 'first'));
            const last = generateRanges(source, rangePick(input, 'last'));

            deepStrictEqual(startEndData(first), [[0, 5, 'only']]);
            deepStrictEqual(startEndData(last), [[0, 5, 'only']]);
        });
    });

    describe('Predicate function', () => {
        it('should pick by data property', () => {
            const input = [
                { start: 0, end: 5, data: { type: 'warning' } },
                { start: 6, end: 11, data: { type: 'error' } },
                { start: 12, end: 17, data: { type: 'info' } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => range.data!.type === 'error')
            );

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].start, 6);
            strictEqual(ranges[0].end, 11);
            strictEqual(ranges[0].data!.type, 'error');
        });

        it('should pick by position', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 10, end: 15, data: 'b' },
                { start: 20, end: 25, data: 'c' }
            ];

            const source = 'a'.repeat(30);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => range.start === 10)
            );

            deepStrictEqual(startEndData(ranges), [[10, 15, 'b']]);
        });

        it('should pick by index', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 6, end: 11, data: 'b' },
                { start: 12, end: 17, data: 'c' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangePick(input, (range, index) => index === 1)
            );

            deepStrictEqual(startEndData(ranges), [[6, 11, 'b']]);
        });

        it('should pick first matching range', () => {
            const input = [
                { start: 0, end: 5, data: 10 },
                { start: 6, end: 11, data: 20 },
                { start: 12, end: 17, data: 30 },
                { start: 18, end: 23, data: 20 }
            ];

            const source = 'a'.repeat(25);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => range.data === 20)
            );

            deepStrictEqual(startEndData(ranges), [[6, 11, 20]]);
        });

        it('should return empty when predicate matches nothing', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 6, end: 11, data: 'b' }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => range.data === 'z')
            );

            strictEqual(ranges.length, 0);
        });
    });

    describe('Context usage', () => {
        it('should provide source in context', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 6, end: 11, data: 'b' }
            ];

            const source = 'hello world';
            const ranges = generateRanges(
                source,
                rangePick(input, (range, index, context) => {
                    return context.source.substring(range.start, range.end) === 'world';
                })
            );

            deepStrictEqual(startEndData(ranges), [[6, 11, 'b']]);
        });

        it('should provide lines in context', () => {
            const input = [
                { start: 0, end: 5, data: 'line0' },
                { start: 6, end: 11, data: 'line1' },
                { start: 12, end: 17, data: 'line2' }
            ];

            const source = 'aaaaa\nbbbbb\nccccc';
            const ranges = generateRanges(
                source,
                rangePick(input, (range, index, { lines }) => {
                    return lines.getLine(range.start) === 2;
                })
            );

            deepStrictEqual(startEndData(ranges), [[6, 11, 'line1']]);
        });

        it('should provide renderOptions in context', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 10, end: 15, data: 'b' },
                { start: 20, end: 25, data: 'c' }
            ];

            const source = 'a'.repeat(30);
            const ranges = generateRanges<string, { viewport: { start: number; end: number } }>(
                source,
                rangePick(input, (range, index, { renderOptions }) => {
                    const viewport = renderOptions?.viewport;
                    return Boolean(viewport && range.start >= viewport.start && range.end <= viewport.end);
                }),
                { renderOptions: { viewport: { start: 8, end: 18 } } }
            );

            deepStrictEqual(startEndData(ranges), [[10, 15, 'b']]);
        });

        it('should provide all ranges in context', () => {
            const input = [
                { start: 0, end: 5, data: 1 },
                { start: 6, end: 11, data: 2 },
                { start: 12, end: 17, data: 3 }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangePick(input, (range, index, { ranges }) => {
                    // Pick the middle range
                    return index === Math.floor(ranges.length / 2);
                })
            );

            deepStrictEqual(startEndData(ranges), [[6, 11, 2]]);
        });
    });

    describe('Origin preservation', () => {
        it('should preserve origin from input', () => {
            const origin1 = { start: 0, end: 5, data: 'original-a' };
            const origin2 = { start: 6, end: 11, data: 'original-b' };

            const input = [
                { start: 0, end: 5, data: 'a', origin: origin1 },
                { start: 6, end: 11, data: 'b', origin: origin2 }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(source, rangePick(input, 'first'));

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].origin, origin1);
        });

        it('should preserve origin with predicate', () => {
            const origin1 = { start: 0, end: 5, data: 'original-a' };
            const origin2 = { start: 6, end: 11, data: 'original-b' };
            const origin3 = { start: 12, end: 17, data: 'original-c' };

            const input = [
                { start: 0, end: 5, data: 'a', origin: origin1 },
                { start: 6, end: 11, data: 'b', origin: origin2 },
                { start: 12, end: 17, data: 'c', origin: origin3 }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => range.data === 'c')
            );

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].origin, origin3);
        });
    });

    describe('Complex scenarios', () => {
        it('should pick by range length', () => {
            const input = [
                { start: 0, end: 3, data: 'short' },
                { start: 5, end: 15, data: 'long' },
                { start: 16, end: 20, data: 'medium' }
            ];

            const source = 'a'.repeat(25);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => {
                    const length = range.end - range.start;
                    return length > 5;
                })
            );

            deepStrictEqual(startEndData(ranges), [[5, 15, 'long']]);
        });

        it('should pick multiline range', () => {
            const input = [
                { start: 0, end: 3, data: 'single' },
                { start: 5, end: 12, data: 'multi' },
                { start: 13, end: 15, data: 'single2' }
            ];

            const source = 'abc\ndefgh\nijklm';
            const ranges = generateRanges(
                source,
                rangePick(input, (range, index, { lines }) => {
                    return lines.getLine(range.start) !== lines.getLine(range.end);
                })
            );

            deepStrictEqual(startEndData(ranges), [[5, 12, 'multi']]);
        });

        it('should pick by comparison with other ranges', () => {
            const input = [
                { start: 0, end: 5, data: { priority: 1 } },
                { start: 6, end: 11, data: { priority: 3 } },
                { start: 12, end: 17, data: { priority: 2 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangePick(input, (range, index, { ranges }) => {
                    // Pick the range with highest priority
                    const maxPriority = Math.max(...ranges.map(r => r.data!.priority));
                    return range.data!.priority === maxPriority;
                })
            );

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].data!.priority, 3);
        });

        it('should work with overlapping ranges', () => {
            const input = [
                { start: 0, end: 10, data: 'outer' },
                { start: 3, end: 7, data: 'inner' },
                { start: 15, end: 20, data: 'separate' }
            ];

            const source = 'a'.repeat(25);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => {
                    // Pick the shortest range
                    const length = range.end - range.start;
                    return length < 10;
                })
            );

            deepStrictEqual(startEndData(ranges), [[3, 7, 'inner']]);
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
                rangePick(input, (range) => range.data !== undefined)
            );

            deepStrictEqual(startEndData(ranges), [[6, 11, 'defined']]);
        });

        it('should handle zero-length ranges', () => {
            const input = [
                { start: 5, end: 5, data: 'empty' },
                { start: 10, end: 15, data: 'normal' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangePick(input, (range) => range.start === range.end)
            );

            deepStrictEqual(startEndData(ranges), [[5, 5, 'empty']]);
        });

        it('should handle all ranges at same position', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 0, end: 5, data: 'b' },
                { start: 0, end: 5, data: 'c' }
            ];

            const source = 'a'.repeat(10);
            const first = generateRanges(source, rangePick(input, 'first'));
            const last = generateRanges(source, rangePick(input, 'last'));

            deepStrictEqual(startEndData(first), [[0, 5, 'a']]);
            deepStrictEqual(startEndData(last), [[0, 5, 'c']]);
        });
    });
});

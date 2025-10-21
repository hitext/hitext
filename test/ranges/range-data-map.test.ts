import { deepStrictEqual, strictEqual } from 'assert';
import { rangeDataMap, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeDataMap', () => {
    describe('Basic transformation', () => {
        it('should transform data while preserving positions', () => {
            const input = [
                { start: 0, end: 5, data: 1 },
                { start: 6, end: 11, data: 2 },
                { start: 12, end: 17, data: 3 }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data) => data * 2)
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
                { start: 6, end: 11, data: 'string' },
                { start: 12, end: 17, data: 'number' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data) => ({ type: data, highlighted: true }))
            );

            strictEqual(ranges.length, 3);
            deepStrictEqual(ranges[0].data, { type: 'keyword', highlighted: true });
            deepStrictEqual(ranges[1].data, { type: 'string', highlighted: true });
            deepStrictEqual(ranges[2].data, { type: 'number', highlighted: true });
        });

        it('should handle empty input', () => {
            const source = 'test';
            const ranges = generateRanges(
                source,
                rangeDataMap([], (data) => data)
            );

            deepStrictEqual(ranges, []);
        });

        it('should transform undefined data', () => {
            const input = [
                { start: 0, end: 5 },
                { start: 6, end: 11 }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data) => ({ value: data, hasData: data !== undefined }))
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(ranges[0].data, { value: undefined, hasData: false });
            deepStrictEqual(ranges[1].data, { value: undefined, hasData: false });
        });
    });

    describe('Using range parameter', () => {
        it('should access range start and end in mapper', () => {
            const input = [
                { start: 0, end: 5, data: 'a' },
                { start: 10, end: 20, data: 'b' },
                { start: 25, end: 30, data: 'c' }
            ];

            const source = 'a'.repeat(35);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range) => ({
                    original: data,
                    length: range.end - range.start
                }))
            );

            deepStrictEqual(ranges.map(r => r.data), [
                { original: 'a', length: 5 },
                { original: 'b', length: 10 },
                { original: 'c', length: 5 }
            ]);
        });

        it('should combine original data with range info', () => {
            const input = [
                { start: 0, end: 5, data: { type: 'keyword' } },
                { start: 6, end: 11, data: { type: 'string' } }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range) => ({
                    ...data,
                    start: range.start,
                    end: range.end
                }))
            );

            deepStrictEqual(ranges[0].data, { type: 'keyword', start: 0, end: 5 });
            deepStrictEqual(ranges[1].data, { type: 'string', start: 6, end: 11 });
        });
    });

    describe('Using index parameter', () => {
        it('should provide correct index to mapper', () => {
            const input = [
                { start: 0, end: 1, data: 'a' },
                { start: 1, end: 2, data: 'b' },
                { start: 2, end: 3, data: 'c' }
            ];

            const source = 'abc';
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index) => ({ char: data, index }))
            );

            deepStrictEqual(ranges.map(r => r.data), [
                { char: 'a', index: 0 },
                { char: 'b', index: 1 },
                { char: 'c', index: 2 }
            ]);
        });

        it('should add sequential numbering', () => {
            const input = Array.from({ length: 5 }, (_, i) => ({
                start: i * 2,
                end: i * 2 + 1,
                data: { value: i }
            }));

            const source = 'a'.repeat(11);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index) => ({
                    ...data,
                    label: `#${index + 1}`
                }))
            );

            deepStrictEqual(ranges.map(r => r.data!.label), ['#1', '#2', '#3', '#4', '#5']);
        });
    });

    describe('Using context', () => {
        it('should access source text in mapper', () => {
            const input = [
                { start: 0, end: 5, data: {} },
                { start: 6, end: 11, data: {} }
            ];

            const source = 'Hello World';
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index, { source: src }) => ({
                    ...data,
                    text: src.slice(range.start, range.end)
                }))
            );

            deepStrictEqual(ranges.map(r => r.data!.text), ['Hello', 'World']);
        });

        it('should use lines helper from context', () => {
            const input = [
                { start: 0, end: 5, data: { text: 'line1' } },
                { start: 6, end: 11, data: { text: 'line2' } },
                { start: 12, end: 17, data: { text: 'line3' } }
            ];

            const source = 'line1\nline2\nline3';
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index, { lines }) => ({
                    ...data,
                    line: lines.getLine(range.start),
                    column: lines.getColumn(range.start)
                }))
            );

            deepStrictEqual(ranges[0].data, { text: 'line1', line: 1, column: 1 });
            deepStrictEqual(ranges[1].data, { text: 'line2', line: 2, column: 1 });
            deepStrictEqual(ranges[2].data, { text: 'line3', line: 3, column: 1 });
        });

        it('should access all ranges in context', () => {
            const input = [
                { start: 0, end: 5, data: { value: 10 } },
                { start: 6, end: 11, data: { value: 20 } },
                { start: 12, end: 17, data: { value: 30 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index, { ranges }) => {
                    const total = ranges.reduce((sum, r) => sum + (r.data?.value || 0), 0);
                    return { ...data, total };
                })
            );

            // All ranges should have the same total (60)
            deepStrictEqual(ranges.map(r => r.data!.total), [60, 60, 60]);
        });

        it('should use renderOptions from context', () => {
            interface RenderOpts {
                theme: string;
            }

            const input = [
                { start: 0, end: 5, data: { type: 'A' } },
                { start: 6, end: 11, data: { type: 'B' } }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeDataMap<any, any, RenderOpts>(input, (data, range, index, { renderOptions }) => ({
                    ...data,
                    theme: renderOptions?.theme || 'default'
                })),
                { renderOptions: { theme: 'dark' } }
            );

            deepStrictEqual(ranges.map(r => (r.data as any).theme), ['dark', 'dark']);
        });
    });

    describe('Origin handling', () => {
        it('should create new origin when transforming data', () => {
            const origin = { start: 100, end: 200, data: 'original' };
            const input = [
                { start: 0, end: 5, data: 'a', origin },
                { start: 6, end: 11, data: 'b', origin }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data) => data.toUpperCase())
            );

            strictEqual(ranges.length, 2);
            // New data means new origin - should be undefined
            strictEqual(ranges[0].origin, undefined);
            strictEqual(ranges[1].origin, undefined);
            strictEqual(ranges[0].data, 'A');
            strictEqual(ranges[1].data, 'B');
        });

        it('should not preserve old origins after transformation', () => {
            const input = [
                { start: 0, end: 5, data: 1, origin: { start: 0, end: 5, data: 1 } },
                { start: 6, end: 11, data: 2, origin: { start: 6, end: 11, data: 2 } },
                { start: 12, end: 17, data: 3, origin: { start: 12, end: 17, data: 3 } }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data) => ({ value: data * 10 }))
            );

            strictEqual(ranges.length, 3);
            // rangeDataMap creates new ranges with new data, so no origin tracking
            strictEqual(ranges[0].origin, undefined);
            strictEqual(ranges[1].origin, undefined);
            strictEqual(ranges[2].origin, undefined);
            deepStrictEqual(ranges.map(r => r.data), [
                { value: 10 },
                { value: 20 },
                { value: 30 }
            ]);
        });
    });

    describe('Complex transformations', () => {
        it('should enrich data with text content', () => {
            const input = [
                { start: 0, end: 5, data: { type: 'word' } },
                { start: 6, end: 11, data: { type: 'word' } },
                { start: 12, end: 17, data: { type: 'word' } }
            ];

            const source = 'hello world sweet';
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index, { source: src }) => ({
                    ...data,
                    text: src.slice(range.start, range.end),
                    uppercase: src.slice(range.start, range.end).toUpperCase()
                }))
            );

            deepStrictEqual(ranges[0].data, { type: 'word', text: 'hello', uppercase: 'HELLO' });
            deepStrictEqual(ranges[1].data, { type: 'word', text: 'world', uppercase: 'WORLD' });
            deepStrictEqual(ranges[2].data, { type: 'word', text: 'sweet', uppercase: 'SWEET' });
        });

        it('should add positional metadata', () => {
            const input = [
                { start: 0, end: 3, data: { word: 'one' } },
                { start: 4, end: 7, data: { word: 'two' } },
                { start: 8, end: 13, data: { word: 'three' } }
            ];

            const source = 'one two three';
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index, { lines }) => ({
                    ...data,
                    index,
                    position: { start: range.start, end: range.end },
                    line: lines.getLine(range.start),
                    length: range.end - range.start
                }))
            );

            strictEqual(ranges[0].data!.index, 0);
            deepStrictEqual(ranges[0].data!.position, { start: 0, end: 3 });
            strictEqual(ranges[0].data!.length, 3);
        });

        it('should compute relative positions', () => {
            const input = [
                { start: 5, end: 10, data: {} },
                { start: 15, end: 20, data: {} },
                { start: 25, end: 30, data: {} }
            ];

            const source = 'a'.repeat(35);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index, { ranges: allRanges }) => {
                    const firstRange = allRanges[0];
                    return {
                        ...data,
                        offsetFromFirst: range.start - firstRange.start
                    };
                })
            );

            deepStrictEqual(ranges.map(r => r.data!.offsetFromFirst), [0, 10, 20]);
        });

        it('should chain multiple transformations', () => {
            const input = [
                { start: 0, end: 3, data: 'one' },
                { start: 4, end: 7, data: 'two' },
                { start: 8, end: 13, data: 'three' }
            ];

            const source = 'one two three';

            // First transformation: add length
            const step1 = rangeDataMap(input, (data, range) => ({
                text: data,
                length: range.end - range.start
            }));

            // Second transformation: add uppercase
            const step2 = rangeDataMap(step1, (data) => ({
                ...data,
                upper: data.text.toUpperCase()
            }));

            const ranges = generateRanges(source, step2);

            deepStrictEqual(ranges[0].data, { text: 'one', length: 3, upper: 'ONE' });
            deepStrictEqual(ranges[1].data, { text: 'two', length: 3, upper: 'TWO' });
            deepStrictEqual(ranges[2].data, { text: 'three', length: 5, upper: 'THREE' });
        });
    });

    describe('Edge cases', () => {
        it('should handle zero-width ranges', () => {
            const input = [
                { start: 0, end: 0, data: 'zero1' },
                { start: 5, end: 5, data: 'zero2' }
            ];

            const source = 'a'.repeat(10);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range) => ({
                    original: data,
                    isZeroWidth: range.start === range.end
                }))
            );

            strictEqual(ranges.length, 2);
            strictEqual(ranges[0].data!.isZeroWidth, true);
            strictEqual(ranges[1].data!.isZeroWidth, true);
        });

        it('should handle overlapping ranges independently', () => {
            const input = [
                { start: 0, end: 10, data: 'outer' },
                { start: 3, end: 7, data: 'inner' },
                { start: 5, end: 15, data: 'overlap' }
            ];

            const source = 'a'.repeat(20);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range, index) => ({
                    original: data,
                    index,
                    length: range.end - range.start
                }))
            );

            strictEqual(ranges.length, 3);
            deepStrictEqual(ranges[0].data, { original: 'outer', index: 0, length: 10 });
            deepStrictEqual(ranges[1].data, { original: 'inner', index: 1, length: 4 });
            deepStrictEqual(ranges[2].data, { original: 'overlap', index: 2, length: 10 });
        });

        it('should handle complex nested data structures', () => {
            const input = [
                { start: 0, end: 5, data: { meta: { type: 'A', priority: 1 }, tags: ['x', 'y'] } },
                { start: 6, end: 11, data: { meta: { type: 'B', priority: 2 }, tags: ['z'] } }
            ];

            const source = 'a'.repeat(15);
            const ranges = generateRanges(
                source,
                rangeDataMap(input, (data, range) => ({
                    ...data,
                    meta: {
                        ...data.meta,
                        rangeLength: range.end - range.start
                    }
                }))
            );

            deepStrictEqual(ranges[0].data!.meta, { type: 'A', priority: 1, rangeLength: 5 });
            deepStrictEqual(ranges[0].data!.tags, ['x', 'y']);
            deepStrictEqual(ranges[1].data!.meta, { type: 'B', priority: 2, rangeLength: 5 });
            deepStrictEqual(ranges[1].data!.tags, ['z']);
        });
    });
});

import { deepStrictEqual } from 'assert';
import { applyAugment, generateRanges, type RangeRecord } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyAugment', () => {
    it('should pass through original ranges unchanged', () => {
        const input = [
            { start: 0, end: 5, data: 'hello' },
            { start: 6, end: 11, data: 'world' }
        ];

        const ranges = generateRanges(
            'hello world',
            applyAugment<string, unknown>(() => {
                // No additional ranges
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should preserve origin from original ranges', () => {
        const origin = { start: 100, end: 200, data: 'root' };
        const input = [{ start: 0, end: 5, data: 'test', origin }];

        const ranges = generateRanges(
            'test value',
            applyAugment<string, unknown>(() => {
                // No additional ranges
            })(input)
        );

        deepStrictEqual(ranges[0].origin, origin);
    });

    it('should add markers around ranges', () => {
        const input = [{ start: 0, end: 5, data: 'word' }];

        const ranges = generateRanges(
            'word test',
            applyAugment<string, unknown>((range, createRange) => {
                createRange(range.start, range.start, 'start');
                createRange(range.end, range.end, 'end');
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'word'],  // Original
            [0, 0, 'start'], // Start marker
            [5, 5, 'end']    // End marker
        ]);
    });

    it('should set origin for additional ranges', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const ranges = generateRanges(
            'test value',
            applyAugment<string, unknown>((range, createRange) => {
                createRange(range.start, range.start, 'marker');
            })(input)
        );

        // Additional range should have origin pointing to input range
        const additionalRange = ranges.find(r => r.data === 'marker');
        const origin = additionalRange!.origin as RangeRecord<string>;
        deepStrictEqual(origin.start, 0);
        deepStrictEqual(origin.end, 5);
        deepStrictEqual(origin.data, 'test');
    });

    it('should preserve origin chain for additional ranges', () => {
        const rootOrigin = { start: 100, end: 200, data: 'root' };
        const input = [{ start: 0, end: 5, data: 'test', origin: rootOrigin }];

        const ranges = generateRanges(
            'test value',
            applyAugment<string, unknown>((range, createRange) => {
                createRange(range.start, range.start, 'marker');
            })(input)
        );

        // Additional range should inherit the root origin
        const additionalRange = ranges.find(r => r.data === 'marker');
        deepStrictEqual(additionalRange!.origin, rootOrigin);
    });

    it('should use index from context', () => {
        const input = [
            { start: 0, end: 1, data: 0 },
            { start: 1, end: 2, data: 1 },
            { start: 2, end: 3, data: 2 }
        ];

        const ranges = generateRanges(
            'abc',
            applyAugment<number, unknown>((range, createRange, { index }) => {
                createRange(range.end, range.end, index * 10);
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 1, 0],   // Original
            [1, 1, 0],   // Additional (index 0)
            [1, 2, 1],   // Original
            [2, 2, 10],  // Additional (index 1)
            [2, 3, 2],   // Original
            [3, 3, 20]   // Additional (index 2)
        ]);
    });

    it('should access document from context', () => {
        const input = [{ start: 0, end: 5 }];

        const ranges = generateRanges(
            'Hello world',
            applyAugment<undefined, unknown>((range, createRange, { document }) => {
                const text = document.slice(range.start, range.end);
                createRange(range.end, range.end, text.toUpperCase() as any);
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, undefined], // Original
            [5, 5, 'HELLO']    // Additional with transformed text
        ]);
    });

    it('should access lines from context', () => {
        const input = [{ start: 6, end: 11 }]; // 'world'

        const ranges = generateRanges(
            'hello world\ntest line',
            applyAugment<undefined, unknown>((range, createRange, { lines }) => {
                const lineStart = lines.getLineStart(range.start);
                createRange(lineStart, lineStart, 'line-start' as any);
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [6, 11, undefined],    // Original
            [0, 0, 'line-start']   // Start of line containing range
        ]);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges(
            'test',
            applyAugment<undefined, unknown>((range, createRange) => {
                createRange(range.start, range.start, 'marker' as any);
            })([])
        );

        deepStrictEqual(ranges, []);
    });

    it('should allow creating multiple additional ranges per input', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const ranges = generateRanges(
            'test value',
            applyAugment<string, unknown>((range, createRange) => {
                createRange(range.start, range.start, 'before');
                createRange(range.end, range.end, 'after');
                createRange(range.start, range.end, 'overlay');
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'test'],    // Original
            [0, 0, 'before'],  // Additional
            [5, 5, 'after'],   // Additional
            [0, 5, 'overlay']  // Additional
        ]);
    });

    it('should work with renderOptions', () => {
        const input = [{ start: 0, end: 5 }];

        const ranges = generateRanges(
            'hello',
            applyAugment<undefined, { prefix: string }>((range, createRange, { renderOptions }) => {
                const prefix = renderOptions?.prefix ?? '';
                if (prefix) {
                    createRange(range.start, range.start, prefix as any);
                }
            })(input),
            { renderOptions: { prefix: '>>>' } }
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, undefined], // Original
            [0, 0, '>>>']      // Additional with prefix
        ]);
    });
});

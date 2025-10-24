import { deepStrictEqual } from 'assert';
import { applyMap, generateRanges, type RangeRecord } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyMap', () => {
    it('should map 1-to-1 (duplicate ranges)', () => {
        const input = [
            { start: 0, end: 5, data: 'hello' },
            { start: 6, end: 11, data: 'world' }
        ];

        const ranges = generateRanges(
            'hello world',
            applyMap<string, string, unknown>((range, createRange) => {
                createRange(range.start, range.end, range.data);
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should map 1-to-N (split ranges)', () => {
        const input = [{ start: 0, end: 11, data: 'hello world' }];

        const ranges = generateRanges(
            'hello world',
            applyMap<string, string, unknown>((range, createRange, { document }) => {
                const text = document.slice(range.start, range.end);
                const words = text.split(' ');
                let offset = range.start;

                for (const word of words) {
                    createRange(offset, offset + word.length, word);
                    offset += word.length + 1; // +1 for space
                }
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should map 1-to-0 (filter out ranges)', () => {
        const input = [
            { start: 0, end: 5, data: 'keep' },
            { start: 6, end: 10, data: 'skip' },
            { start: 11, end: 15, data: 'keep' }
        ];

        const ranges = generateRanges(
            'keep skip keep',
            applyMap<string, string, unknown>((range, createRange) => {
                if (range.data === 'keep') {
                    createRange(range.start, range.end, range.data);
                }
                // Don't call createRange for 'skip' - effectively filters it out
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'keep'],
            [11, 15, 'keep']
        ]);
    });

    it('should expand ranges using lines context', () => {
        const input = [{ start: 6, end: 11 }]; // 'world'

        const ranges = generateRanges(
            'hello world\ntest line',
            applyMap<undefined, undefined, unknown>((range, createRange, { lines }) => {
                const start = lines.getLineStart(range.start);
                const end = lines.getLineEnd(range.start);
                createRange(start, end);
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 12, undefined] // Entire first line including newline
        ]);
    });

    it('should preserve origin automatically', () => {
        const input = [
            { start: 0, end: 5, data: 'test', origin: { start: 0, end: 10, data: 'root' } }
        ];

        const ranges = generateRanges(
            'test value',
            applyMap<string, string, unknown>((range, createRange) => {
                createRange(range.start, range.end, 'mapped');
            })(input)
        );

        // Origin should be preserved (without checking type symbol)
        deepStrictEqual(ranges[0].start, 0);
        deepStrictEqual(ranges[0].end, 5);
        deepStrictEqual(ranges[0].data, 'mapped');
        deepStrictEqual(ranges[0].origin, { start: 0, end: 10, data: 'root' });
    });

    it('should create origin from range when no origin exists', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const ranges = generateRanges(
            'test value',
            applyMap<string, string, unknown>((range, createRange) => {
                createRange(range.start, range.end, 'mapped');
            })(input)
        );

        // Origin should be created from input range (with type symbol from generateRanges)
        deepStrictEqual(ranges[0].start, 0);
        deepStrictEqual(ranges[0].end, 5);
        deepStrictEqual(ranges[0].data, 'mapped');
        // Check origin properties individually (type is a Symbol so we skip it)
        const origin = ranges[0].origin as RangeRecord<string>;
        deepStrictEqual(origin.start, 0);
        deepStrictEqual(origin.end, 5);
        deepStrictEqual(origin.data, 'test');
    });

    it('should use index from context', () => {
        const input = [
            { start: 0, end: 1, data: 0 },
            { start: 1, end: 2, data: 1 },
            { start: 2, end: 3, data: 2 }
        ];

        const ranges = generateRanges(
            'abc',
            applyMap<number, number, unknown>((range, createRange, { index }) => {
                createRange(range.start, range.end, index);
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2]
        ]);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges(
            'test',
            applyMap<undefined, undefined, unknown>((range, createRange) => {
                createRange(range.start, range.end);
            })([])
        );

        deepStrictEqual(ranges, []);
    });

    it('should allow creating multiple ranges with different positions', () => {
        const input = [{ start: 0, end: 5 }]; // 'hello'

        const ranges = generateRanges(
            'hello world',
            applyMap<undefined, string, unknown>((range, createRange) => {
                createRange(range.start, range.start + 1, 'first');
                createRange(range.end - 1, range.end, 'last');
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 1, 'first'],
            [4, 5, 'last']
        ]);
    });

    it('should access document from context', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11 }
        ];

        const ranges = generateRanges(
            'Hello World',
            applyMap<undefined, string, unknown>((range, createRange, { document }) => {
                const text = document.slice(range.start, range.end);
                createRange(range.start, range.end, text.toUpperCase());
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'HELLO'],
            [6, 11, 'WORLD']
        ]);
    });

    it('should access renderOptions from context', () => {
        const input = [{ start: 0, end: 5 }];

        const ranges = generateRanges(
            'hello',
            applyMap<undefined, number, { multiplier: number }>((range, createRange, { renderOptions }) => {
                const multiplier = renderOptions?.multiplier ?? 1;
                createRange(range.start, range.end, (range.end - range.start) * multiplier);
            })(input),
            { renderOptions: { multiplier: 3 } }
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 15] // (5 - 0) * 3
        ]);
    });

    it('should chain with other transformers', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' }
        ];

        const ranges = generateRanges(
            'hello world',
            applyMap<string, string, unknown>((range, createRange) => {
                // Duplicate each range
                createRange(range.start, range.end, range.data);
                createRange(range.start, range.end, range.data + '2');
            })(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'a'],
            [0, 5, 'a2'],
            [6, 11, 'b'],
            [6, 11, 'b2']
        ]);
    });
});

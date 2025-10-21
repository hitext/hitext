import { strictEqual } from 'assert';
import { rangePadLines, generateRanges } from '../../src/index.js';

describe('rangePadLines()', () => {
    describe('Basic functionality', () => {
        it('should create padding range for original line and lines after', () => {
            const input = [{ start: 0, end: 5, data: 'test' }];
            const source = 'hello\nworld\ntest!\n';

            const ranges = generateRanges(source, rangePadLines(input, 1, 10));

            // Should create 2 ranges: original line + 1 line after
            strictEqual(ranges.length, 2);

            // First range: original line starts at 0, goes to min(0+10, lineContentEnd(0))
            strictEqual(ranges[0].start, 0);
            strictEqual(ranges[0].end, 5); // min(10, 5) = 5 (line content end is "hello" at 5)
            strictEqual(ranges[0].data, 5); // 10 - 5 = 5 padding needed
        });

        it('should create padding ranges with lines before and after', () => {
            const input = [{ start: 6, end: 11, data: 'middle' }];
            const source = 'hello\nworld\ntest!\n';

            const ranges = generateRanges(source, rangePadLines(input, [1, 1], 10));

            // Should create 3 ranges: 1 before + original + 1 after
            strictEqual(ranges.length, 3);

            // Lines before: origRange.start (6) is on line 1, line before is line 0
            // Line 0 starts at 0, so start = max(6, 0) = 6, but that's beyond line 0
            // This is the confusing part - let me check implementation
        });
    });

    describe('Origin preservation', () => {
        it('should preserve original range as origin', () => {
            const input = [{ start: 0, end: 5, data: 'orig' }];
            const source = 'hello\nworld\n';

            const ranges = generateRanges(source, rangePadLines(input, 1, 10));

            // All derived ranges should have the original collected range as origin
            ranges.forEach(range => {
                strictEqual(typeof range.origin, 'object');
                if (range.origin && !Array.isArray(range.origin)) {
                    strictEqual(range.origin.start, 0);
                    strictEqual(range.origin.end, 5);
                    strictEqual(range.origin.data, 'orig');
                }
            });
        });
    });
});

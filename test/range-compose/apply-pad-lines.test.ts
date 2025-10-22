import { strictEqual } from 'assert';
import { applyPadLines, generateRanges } from '../../src/index.js';

describe('applyPadLines()', () => {
    it('should create padding range for original line and lines after', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];
        const source = 'hello\nworld\ntest!\n';
        const ranges = generateRanges(source, applyPadLines(1, 10)(input));

        strictEqual(ranges.length, 2);
        strictEqual(ranges[0].start, 0);
        strictEqual(ranges[0].end, 5);
        strictEqual(ranges[0].data, 5);
    });

    it('should create padding ranges with lines before and after', () => {
        const input = [{ start: 6, end: 11, data: 'middle' }];
        const source = 'hello\nworld\ntest!\n';
        const ranges = generateRanges(source, applyPadLines([1, 1], 10)(input));
        strictEqual(ranges.length, 3);
    });

    it('should preserve original range as origin', () => {
        const input = [{ start: 0, end: 5, data: 'orig' }];
        const source = 'hello\nworld\n';
        const ranges = generateRanges(source, applyPadLines(1, 10)(input));

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

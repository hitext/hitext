import { strictEqual, deepStrictEqual } from 'assert';
import { applyPick, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyPick()', () => {
    it('should pick first range', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' },
            { start: 12, end: 17, data: 'c' }
        ];
        const ranges = generateRanges('Hello world', applyPick('first')(input));
        deepStrictEqual(startEndData(ranges), [[0, 5, 'a']]);
    });

    it('should pick last range', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' },
            { start: 12, end: 17, data: 'c' }
        ];
        const ranges = generateRanges('Hello world', applyPick('last')(input));
        deepStrictEqual(startEndData(ranges), [[12, 17, 'c']]);
    });

    it('should return empty when input is empty', () => {
        const ranges = generateRanges('test', applyPick('first')([]));
        strictEqual(ranges.length, 0);
    });

    it('should pick by data property using predicate', () => {
        const input = [
            { start: 0, end: 5, data: { type: 'warning' } },
            { start: 6, end: 11, data: { type: 'error' } },
            { start: 12, end: 17, data: { type: 'info' } }
        ];
        const ranges = generateRanges(
            'Hello world',
            applyPick<{ type: string }, unknown>((range) => range.data!.type === 'error')(input)
        );
        strictEqual(ranges[0].data!.type, 'error');
    });

    it('should pick by position', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 10, end: 15, data: 'b' },
            { start: 20, end: 25, data: 'c' }
        ];
        const ranges = generateRanges('Hello world', applyPick((range) => range.start === 10)(input));
        deepStrictEqual(startEndData(ranges), [[10, 15, 'b']]);
    });

    it('should pick by index', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' },
            { start: 12, end: 17, data: 'c' }
        ];
        const ranges = generateRanges('Hello world', applyPick((range, index) => index === 1)(input));
        deepStrictEqual(startEndData(ranges), [[6, 11, 'b']]);
    });

    it('should return empty when predicate matches nothing', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' }
        ];
        const ranges = generateRanges('Hello world', applyPick((range) => range.data === 'z')(input));
        strictEqual(ranges.length, 0);
    });

    it('should provide source in context', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' }
        ];
        const ranges = generateRanges(
            'hello world',
            applyPick((range, index, context) => {
                return context.source.substring(range.start, range.end) === 'world';
            })(input)
        );
        deepStrictEqual(startEndData(ranges), [[6, 11, 'b']]);
    });

    it('should provide lines in context', () => {
        const input = [
            { start: 0, end: 5, data: 'line0' },
            { start: 6, end: 11, data: 'line1' },
            { start: 12, end: 17, data: 'line2' }
        ];
        const ranges = generateRanges(
            'aaaaa\nbbbbb\nccccc',
            applyPick((range, index, { lines }) => lines.getLine(range.start) === 2)(input)
        );
        deepStrictEqual(startEndData(ranges), [[6, 11, 'line1']]);
    });

    it('should preserve origin from input', () => {
        const origin1 = { start: 0, end: 5, data: 'original-a' };
        const origin2 = { start: 6, end: 11, data: 'original-b' };
        const input = [
            { start: 0, end: 5, data: 'a', origin: origin1 },
            { start: 6, end: 11, data: 'b', origin: origin2 }
        ];
        const ranges = generateRanges('Hello world', applyPick('first')(input));
        strictEqual(ranges[0].origin, origin1);
    });

    it('should pick by range length', () => {
        const input = [
            { start: 0, end: 3, data: 'short' },
            { start: 5, end: 15, data: 'long' },
            { start: 16, end: 20, data: 'medium' }
        ];
        const ranges = generateRanges(
            'Hello world',
            applyPick((range) => range.end - range.start > 5)(input)
        );
        deepStrictEqual(startEndData(ranges), [[5, 15, 'long']]);
    });
});

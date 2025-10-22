import { deepStrictEqual, strictEqual } from 'assert';
import { generateRanges, concatRanges } from '../../src/index.js';
import { renderRanges } from '../utils.js';

describe('concatRanges', () => {
    it('should concatenate ranges from multiple sources', () => {
        const combined = renderRanges(
            'Hello world',
            concatRanges(
                [[0, 5]],  // Hello
                [[6, 11]]  // world
            )
        );

        deepStrictEqual(combined, ['Hello', 'world']);
    });

    it('should preserve source order (not position order)', () => {
        const combined = renderRanges(
            'ABC123XYZ789',
            concatRanges(
                [[3, 6], [9, 12]],  // 123, 789 (later in text)
                [[0, 3], [6, 9]]    // ABC, XYZ (earlier in text)
            )
        );

        // Order follows input order: digits first, then letters
        deepStrictEqual(combined, ['123', '789', 'ABC', 'XYZ']);
    });

    it('should preserve duplicates', () => {
        const combined = renderRanges(
            'Hello world',
            concatRanges(
                [[0, 5]],
                [[0, 5]],
                [[6, 11]]
            )
        );

        deepStrictEqual(combined, ['Hello', 'Hello', 'world']);
    });

    it('should work with single source', () => {
        const combined = renderRanges(
            'Hello world',
            concatRanges([[0, 5], [6, 11]])
        );

        deepStrictEqual(combined, ['Hello', 'world']);
    });

    it('should work with many sources', () => {
        const combined = renderRanges(
            'a1b2c3',
            concatRanges(
                [[0, 1]],                    // a
                [[1, 2], [3, 4], [5, 6]],    // 1, 2, 3
                [[2, 3], [4, 5]]             // b, c
            )
        );

        deepStrictEqual(combined, ['a', '1', '2', '3', 'b', 'c']);
    });

    it('should handle empty sources', () => {
        const combined = renderRanges(
            'Hello world',
            concatRanges(
                [],
                [[0, 5]],
                []
            )
        );

        deepStrictEqual(combined, ['Hello']);
    });

    it('should handle all empty sources', () => {
        const combined = renderRanges(
            'Hello world',
            concatRanges()
        );

        deepStrictEqual(combined, []);
    });

    it('should handle overlapping ranges', () => {
        const combined = renderRanges(
            'abcdefgh',
            concatRanges(
                [[0, 4]],  // abcd
                [[2, 6]]   // cdef (overlaps)
            )
        );

        deepStrictEqual(combined, ['abcd', 'cdef']);
    });

    it('should handle zero-length ranges', () => {
        const combined = renderRanges(
            'Hello',
            concatRanges(
                [[0, 0]],
                [[5, 5]]
            )
        );

        deepStrictEqual(combined, ['', '']);
    });

    it('should preserve data from sources', () => {
        const combined = renderRanges(
            'Hello world',
            concatRanges(
                [[0, 5, { type: 'greeting' }]],
                [[6, 11, { type: 'noun' }]]
            )
        );

        deepStrictEqual(combined, ['Hello', 'world']);
    });

    it('should preserve origins when present', () => {
        const source = 'Hello world';
        const ranges = generateRanges(
            source,
            concatRanges(
                [{ start: 0, end: 5, data: 'a', origin: { start: 100, end: 105, data: 'orig1' } }],
                [{ start: 6, end: 11, data: 'b', origin: { start: 200, end: 205, data: 'orig2' } }]
            )
        );

        strictEqual(ranges.length, 2);
        deepStrictEqual(ranges[0].origin, { start: 100, end: 105, data: 'orig1' });
        deepStrictEqual(ranges[1].origin, { start: 200, end: 205, data: 'orig2' });
    });

    it('should handle missing origins gracefully', () => {
        const source = 'Hello world';
        const ranges = generateRanges(
            source,
            concatRanges(
                [[0, 5]],
                [[6, 11]]
            )
        );

        strictEqual(ranges.length, 2);
        strictEqual(ranges[0].origin, undefined);
        strictEqual(ranges[1].origin, undefined);
    });
});

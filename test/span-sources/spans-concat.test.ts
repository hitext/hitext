import { deepStrictEqual, strictEqual } from 'assert';
import { generateSpans, spansConcat } from '../../src/index.js';
import { renderSpans } from '../utils.js';

describe('spansConcat', () => {
    it('should concatenate spans from multiple documents', () => {
        const combined = renderSpans(
            'Hello world',
            spansConcat(
                [[0, 5]],  // Hello
                [[6, 11]]  // world
            )
        );

        deepStrictEqual(combined, ['Hello', 'world']);
    });

    it('should preserve document order (not position order)', () => {
        const combined = renderSpans(
            'ABC123XYZ789',
            spansConcat(
                [[3, 6], [9, 12]],  // 123, 789 (later in text)
                [[0, 3], [6, 9]]    // ABC, XYZ (earlier in text)
            )
        );

        // Order follows input order: digits first, then letters
        deepStrictEqual(combined, ['123', '789', 'ABC', 'XYZ']);
    });

    it('should preserve duplicates', () => {
        const combined = renderSpans(
            'Hello world',
            spansConcat(
                [[0, 5]],
                [[0, 5]],
                [[6, 11]]
            )
        );

        deepStrictEqual(combined, ['Hello', 'Hello', 'world']);
    });

    it('should work with single document', () => {
        const combined = renderSpans(
            'Hello world',
            spansConcat([[0, 5], [6, 11]])
        );

        deepStrictEqual(combined, ['Hello', 'world']);
    });

    it('should work with many documents', () => {
        const combined = renderSpans(
            'a1b2c3',
            spansConcat(
                [[0, 1]],                    // a
                [[1, 2], [3, 4], [5, 6]],    // 1, 2, 3
                [[2, 3], [4, 5]]             // b, c
            )
        );

        deepStrictEqual(combined, ['a', '1', '2', '3', 'b', 'c']);
    });

    it('should handle empty documents', () => {
        const combined = renderSpans(
            'Hello world',
            spansConcat(
                [],
                [[0, 5]],
                []
            )
        );

        deepStrictEqual(combined, ['Hello']);
    });

    it('should handle all empty documents', () => {
        const combined = renderSpans(
            'Hello world',
            spansConcat()
        );

        deepStrictEqual(combined, []);
    });

    it('should handle overlapping spans', () => {
        const combined = renderSpans(
            'abcdefgh',
            spansConcat(
                [[0, 4]],  // abcd
                [[2, 6]]   // cdef (overlaps)
            )
        );

        deepStrictEqual(combined, ['abcd', 'cdef']);
    });

    it('should handle zero-length spans', () => {
        const combined = renderSpans(
            'Hello',
            spansConcat(
                [[0, 0]],
                [[5, 5]]
            )
        );

        deepStrictEqual(combined, ['', '']);
    });

    it('should preserve data from documents', () => {
        const combined = renderSpans(
            'Hello world',
            spansConcat(
                [[0, 5, { type: 'greeting' }]],
                [[6, 11, { type: 'noun' }]]
            )
        );

        deepStrictEqual(combined, ['Hello', 'world']);
    });

    it('should preserve origins when present', () => {
        const document = 'Hello world';
        const spans = generateSpans(
            document,
            spansConcat(
                [{ start: 0, end: 5, data: 'a', origin: { start: 100, end: 105, data: 'orig1' } }],
                [{ start: 6, end: 11, data: 'b', origin: { start: 200, end: 205, data: 'orig2' } }]
            )
        );

        strictEqual(spans.length, 2);
        deepStrictEqual(spans[0].origin, { start: 100, end: 105, data: 'orig1' });
        deepStrictEqual(spans[1].origin, { start: 200, end: 205, data: 'orig2' });
    });

    it('should handle missing origins gracefully', () => {
        const document = 'Hello world';
        const spans = generateSpans(
            document,
            spansConcat(
                [[0, 5]],
                [[6, 11]]
            )
        );

        strictEqual(spans.length, 2);
        strictEqual(spans[0].origin, undefined);
        strictEqual(spans[1].origin, undefined);
    });
});

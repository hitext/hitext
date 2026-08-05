import { deepStrictEqual } from 'assert';
import { generateSpans, spansWithFallback } from '../../src/index.js';
import { spanWithoutMarker, startEndData } from '../utils.js';

describe('spansWithFallback', () => {
    it('should use first document when it produces spans', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                [[0, 5]],  // first (used)
                [[6, 11]]  // fallback (not used)
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should use fallback when first document is empty', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                [],        // first (empty)
                [[6, 11]]  // fallback (used)
            )
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should handle null/undefined as empty', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                null as any,
                [[6, 11]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should return empty when all documents are empty', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback([], [], [])
        );

        deepStrictEqual(startEndData(result), []);
    });

    it('should support multiple fallbacks', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                [],        // first (empty)
                [],        // second (empty)
                [[0, 5]],  // third (used)
                [[6, 11]]  // fourth (not reached)
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should preserve data from used document', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                [],
                [[6, 11, { type: 'fallback' }]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, { type: 'fallback' }]
        ]);
    });

    it('should preserve origin information', () => {
        const origin = { type: 'test' as const, start: 0, end: 100, data: null, origin: undefined };
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                [],
                [[6, 11, { type: 'fallback' }, origin]]
            )
        );

        deepStrictEqual(spanWithoutMarker(result), [
            [6, 11, { type: 'fallback' }, origin]
        ]);
    });

    it('should pass through all spans from used document', () => {
        const result = generateSpans(
            'Hello world test',
            spansWithFallback(
                [],
                [[0, 5], [6, 11], [12, 16]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, undefined],
            [12, 16, undefined]
        ]);
    });

    it('should work with generator function that yields nothing', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                () => {
                    // Yields nothing
                },
                [[0, 5]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should work with single input (no fallback)', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback([[0, 5]])
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should handle object form spans', () => {
        const result = generateSpans(
            'Hello world',
            spansWithFallback(
                [],
                [{ start: 0, end: 5 }, { start: 6, end: 11 }]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, undefined]
        ]);
    });

    it('should handle zero-length spans', () => {
        const result = generateSpans(
            'Hello',
            spansWithFallback(
                [],
                [[0, 0]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 0, undefined]
        ]);
    });
});

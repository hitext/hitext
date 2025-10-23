import { deepStrictEqual } from 'assert';
import { generateRanges, rangesWithFallback } from '../../src/index.js';
import { rangeWithoutMarker, startEndData } from '../utils.js';

describe('rangesWithFallback', () => {
    it('should use first document when it produces ranges', () => {
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
                [[0, 5]],  // first (used)
                [[6, 11]]  // fallback (not used)
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should use fallback when first document is empty', () => {
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
                [],        // first (empty)
                [[6, 11]]  // fallback (used)
            )
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should handle null/undefined as empty', () => {
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
                null as any,
                [[6, 11]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should return empty when all documents are empty', () => {
        const result = generateRanges(
            'Hello world',
            rangesWithFallback([], [], [])
        );

        deepStrictEqual(startEndData(result), []);
    });

    it('should support multiple fallbacks', () => {
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
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
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
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
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
                [],
                [[6, 11, { type: 'fallback' }, origin]]
            )
        );

        deepStrictEqual(rangeWithoutMarker(result), [
            [6, 11, { type: 'fallback' }, origin]
        ]);
    });

    it('should pass through all ranges from used document', () => {
        const result = generateRanges(
            'Hello world test',
            rangesWithFallback(
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
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
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
        const result = generateRanges(
            'Hello world',
            rangesWithFallback([[0, 5]])
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should handle object form ranges', () => {
        const result = generateRanges(
            'Hello world',
            rangesWithFallback(
                [],
                [{ start: 0, end: 5 }, { start: 6, end: 11 }]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined],
            [6, 11, undefined]
        ]);
    });

    it('should handle zero-length ranges', () => {
        const result = generateRanges(
            'Hello',
            rangesWithFallback(
                [],
                [[0, 0]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 0, undefined]
        ]);
    });
});

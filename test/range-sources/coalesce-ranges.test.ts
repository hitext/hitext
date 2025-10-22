import { deepStrictEqual } from 'assert';
import { generateRanges, coalesceRanges } from '../../src/index.js';
import { rangeWithoutMarker, startEndData } from '../utils.js';

describe('coalesceRanges', () => {
    it('should use first source when it produces ranges', () => {
        const result = generateRanges(
            'Hello world',
            coalesceRanges(
                [[0, 5]],  // first (used)
                [[6, 11]]  // fallback (not used)
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should use fallback when first source is empty', () => {
        const result = generateRanges(
            'Hello world',
            coalesceRanges(
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
            coalesceRanges(
                null as any,
                [[6, 11]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should return empty when all sources are empty', () => {
        const result = generateRanges(
            'Hello world',
            coalesceRanges([], [], [])
        );

        deepStrictEqual(startEndData(result), []);
    });

    it('should support multiple fallbacks', () => {
        const result = generateRanges(
            'Hello world',
            coalesceRanges(
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

    it('should preserve data from used source', () => {
        const result = generateRanges(
            'Hello world',
            coalesceRanges(
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
            coalesceRanges(
                [],
                [[6, 11, { type: 'fallback' }, origin]]
            )
        );

        deepStrictEqual(rangeWithoutMarker(result), [
            [6, 11, { type: 'fallback' }, origin]
        ]);
    });

    it('should pass through all ranges from used source', () => {
        const result = generateRanges(
            'Hello world test',
            coalesceRanges(
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
            coalesceRanges(
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
            coalesceRanges([[0, 5]])
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should handle object form ranges', () => {
        const result = generateRanges(
            'Hello world',
            coalesceRanges(
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
            coalesceRanges(
                [],
                [[0, 0]]
            )
        );

        deepStrictEqual(startEndData(result), [
            [0, 0, undefined]
        ]);
    });
});

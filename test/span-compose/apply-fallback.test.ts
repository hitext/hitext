import { deepStrictEqual } from 'assert';
import { generateSpans, applyFallback } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyFallback', () => {
    it('should use input when it produces spans', () => {
        const result = generateSpans(
            'Hello world',
            applyFallback([[6, 11]])([[0, 5]])
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });

    it('should use fallback when input is empty', () => {
        const result = generateSpans(
            'Hello world',
            applyFallback([[6, 11]])([])
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should try multiple fallbacks in order', () => {
        const result = generateSpans(
            'Hello world',
            applyFallback(
                [],         // first fallback (empty)
                [[6, 11]],  // second fallback (used)
                [[0, 5]]    // third fallback (not tried)
            )([])
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should return empty when all documents are empty', () => {
        const result = generateSpans(
            'Hello world',
            applyFallback([], [], [])([])
        );

        deepStrictEqual(startEndData(result), []);
    });

    it('should use first non-empty fallback', () => {
        const result = generateSpans(
            'Hello world',
            applyFallback(
                [[6, 11]],  // first fallback (used)
                [[0, 5]]    // second fallback (not tried)
            )([])
        );

        deepStrictEqual(startEndData(result), [
            [6, 11, undefined]
        ]);
    });

    it('should handle null input as empty', () => {
        const result = generateSpans(
            'Hello world',
            applyFallback([[0, 5]])(null as any)
        );

        deepStrictEqual(startEndData(result), [
            [0, 5, undefined]
        ]);
    });
});

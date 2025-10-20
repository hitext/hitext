import { deepStrictEqual } from 'assert';
import { generateRanges, rangeFallback, rangeMatch } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangeFallback', () => {
    describe('Basic fallback behavior', () => {
        it('should use input when it produces ranges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [[0, 5]],
                    [[6, 11]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined]
            ]);
        });

        it('should use fallback when input produces no ranges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [],
                    [[6, 11]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [6, 11, undefined]
            ]);
        });

        it('should use fallback when input is null', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    null as any,
                    [[6, 11]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [6, 11, undefined]
            ]);
        });

        it('should produce no ranges when both input and fallback are empty', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [],
                    []
                )
            );

            deepStrictEqual(startEndData(result), []);
        });
    });

    describe('With generator functions', () => {
        it('should use input generator when it produces ranges', () => {
            const result = generateRanges(
                'error: test warning: test',
                rangeFallback(
                    rangeMatch(/error/gi),
                    rangeMatch(/warning/gi)
                )
            );

            // rangeMatch returns match data, so just check start/end
            deepStrictEqual(result.map(r => [r.start, r.end]), [
                [0, 5]
            ]);
        });

        it('should use fallback generator when input produces no ranges', () => {
            const result = generateRanges(
                'info: test warning: test',
                rangeFallback(
                    rangeMatch(/error/gi),
                    rangeMatch(/warning/gi)
                )
            );

            // rangeMatch returns match data, so just check start/end
            deepStrictEqual(result.map(r => [r.start, r.end]), [
                [11, 18]
            ]);
        });

        it('should handle generator function that yields no ranges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    () => {
                        // Don't create any ranges
                    },
                    [[0, 5]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined]
            ]);
        });
    });

    describe('With data and origin', () => {
        it('should preserve data from input', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [[0, 5, { type: 'input' }]],
                    [[6, 11, { type: 'fallback' }]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, { type: 'input' }]
            ]);
        });

        it('should preserve data from fallback', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
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
                rangeFallback(
                    [],
                    [[6, 11, { type: 'fallback' }, origin]]
                )
            );

            deepStrictEqual(result.map(r => ({ start: r.start, end: r.end, data: r.data, origin: r.origin })), [
                { start: 6, end: 11, data: { type: 'fallback' }, origin }
            ]);
        });
    });

    describe('Multiple ranges', () => {
        it('should pass through all ranges from input', () => {
            const result = generateRanges(
                'Hello world test',
                rangeFallback(
                    [[0, 5], [6, 11], [12, 16]],
                    [[0, 1]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined],
                [6, 11, undefined],
                [12, 16, undefined]
            ]);
        });

        it('should pass through all ranges from fallback', () => {
            const result = generateRanges(
                'Hello world test',
                rangeFallback(
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
    });

    describe('Chained fallbacks', () => {
        it('should support multiple fallbacks with variadic arguments', () => {
            const result = generateRanges(
                'info: no issues or alerts',
                rangeFallback(
                    rangeMatch(/error/gi),
                    rangeMatch(/warning/gi),
                    [[0, 4]]  // Fall back to 'info'
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 4, undefined]
            ]);
        });

        it('should stop at first non-empty result', () => {
            const result = generateRanges(
                'warning: test',
                rangeFallback(
                    rangeMatch(/error/gi),
                    rangeMatch(/warning/gi),
                    [[0, 100]]  // Should not be used
                )
            );

            // rangeMatch returns match data, so just check start/end
            deepStrictEqual(result.map(r => [r.start, r.end]), [
                [0, 7]
            ]);
        });

        it('should support many fallback levels', () => {
            const result = generateRanges(
                'debug: test',
                rangeFallback(
                    rangeMatch(/error/gi),
                    rangeMatch(/warning/gi),
                    rangeMatch(/info/gi),
                    rangeMatch(/debug/gi),
                    [[0, 100]]  // Final fallback not used
                )
            );

            // Should match 'debug'
            deepStrictEqual(result.map(r => [r.start, r.end]), [
                [0, 5]
            ]);
        });

        it('should use final fallback when all others fail', () => {
            const result = generateRanges(
                'trace: test',
                rangeFallback(
                    rangeMatch(/error/gi),
                    rangeMatch(/warning/gi),
                    rangeMatch(/info/gi),
                    [[0, 5]]  // Final fallback used
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined]
            ]);
        });
    });

    describe('Real-world use cases', () => {
        it('should fall back to entire document when no matches found', () => {
            const source = 'No matches here';
            const result = generateRanges(
                source,
                rangeFallback(
                    rangeMatch(/error/gi),
                    [[0, source.length]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 15, undefined]
            ]);
        });

        it('should use specific matches when available', () => {
            const source = 'error: something went wrong';
            const result = generateRanges(
                source,
                rangeFallback(
                    rangeMatch(/error/gi),
                    [[0, source.length]]
                )
            );

            // rangeMatch returns match data, so just check start/end
            deepStrictEqual(result.map(r => [r.start, r.end]), [
                [0, 5]
            ]);
        });

        it('should support insertion point selection with multiple fallbacks', () => {
            // Use case: find TOC insertion point
            const source = 'Some content here\nMore content';
            const result = generateRanges(
                source,
                rangeFallback(
                    rangeMatch(/<!-- TOC -->/),
                    rangeMatch(/^#[^#]/m),  // First H1
                    [[0, 0]]  // Document start
                )
            );

            // Should fall back to document start
            deepStrictEqual(startEndData(result), [
                [0, 0, undefined]
            ]);
        });

        it('should support placeholder detection', () => {
            // Use case: detect if document starts with H1
            const sourceWithH1 = '# Title\nContent';
            const result1 = generateRanges(
                sourceWithH1,
                rangeFallback(
                    rangeMatch(/^#[^#]/m),  // Has H1
                    [[0, 0]]  // No H1, insert placeholder
                )
            );

            // Should match the H1
            deepStrictEqual(result1.map(r => [r.start, r.end]), [
                [0, 2]
            ]);

            // Test without H1
            const sourceWithoutH1 = 'Content without title';
            const result2 = generateRanges(
                sourceWithoutH1,
                rangeFallback(
                    rangeMatch(/^#[^#]/m),  // No H1
                    [[0, 0]]  // Placeholder insertion point
                )
            );

            // Should use fallback (document start for placeholder)
            deepStrictEqual(startEndData(result2), [
                [0, 0, undefined]
            ]);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty source with fallback', () => {
            const result = generateRanges(
                '',
                rangeFallback(
                    rangeMatch(/error/gi),
                    [[0, 0]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 0, undefined]
            ]);
        });

        it('should work with object form ranges', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [],
                    [{ start: 0, end: 5 }, { start: 6, end: 11 }]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined],
                [6, 11, undefined]
            ]);
        });

        it('should handle mixed tuple and object forms', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [],
                    [[0, 5], { start: 6, end: 11, data: 'test' }]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined],
                [6, 11, 'test']
            ]);
        });

        it('should work with single input (no fallback)', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [[0, 5]]
                )
            );

            deepStrictEqual(startEndData(result), [
                [0, 5, undefined]
            ]);
        });

        it('should handle all empty inputs gracefully', () => {
            const result = generateRanges(
                'Hello world',
                rangeFallback(
                    [],
                    [],
                    []
                )
            );

            deepStrictEqual(startEndData(result), []);
        });
    });
});

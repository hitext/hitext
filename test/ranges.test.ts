import { strictEqual, deepStrictEqual } from 'assert';
import {
    generateRanges,
    generateRangesFromLayers,
    rangeMatch,
    rangeMerge,
    rangeInvert,
    rangeExpandToLines
} from '../src/index.js';
import type { GenerateRanges, GeneratedRange } from '../src/types.js';

const startEndPairs = (ranges: GeneratedRange[]) => ranges.map(r => [r.start, r.end]);
const regexpMatch = (input: string, match: string[] | null, index: number) => {
    return match ? Object.assign(match, { input, index, groups: undefined }) : null;
};

describe('Range Generation Helpers', () => {
    describe('generateRanges', () => {
        it('should generate ranges from array of tuples', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                [
                    [0, 5],
                    [6, 11, 'extra']
                ]
            );

            deepStrictEqual(ranges, [
                { type: marker, start: 0, end: 5, data: undefined },
                { type: marker, start: 6, end: 11, data: 'extra' }
            ]);
        });

        it('should generate ranges from array of objects', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                [
                    { start: 0, end: 5 },
                    { start: 6, end: 11, data: { type: 'word' } }
                ]
            );

            deepStrictEqual(ranges, [
                { type: marker, start: 0, end: 5, data: undefined },
                { type: marker, start: 6, end: 11, data: { type: 'word' } }
            ]);
        });

        it('should generate ranges from generator function', () => {
            const marker = Symbol('test');
            const generator: GenerateRanges = (source, createRange) => {
                const words = source.split(/\s+/);
                let offset = 0;

                for (const word of words) {
                    const index = source.indexOf(word, offset);
                    if (index !== -1) {
                        createRange(index, index + word.length, word);
                        offset = index + word.length;
                    }
                }
            };

            const ranges = generateRanges('Hello world', marker, generator);

            deepStrictEqual(ranges, [
                { type: marker, start: 0, end: 5, data: 'Hello' },
                { type: marker, start: 6, end: 11, data: 'world' }
            ]);
        });

        it('should append to existing ranges array', () => {
            const marker1 = Symbol('test1');
            const marker2 = Symbol('test2');

            const existingRanges = generateRanges('Hello', marker1, [[0, 5]]);
            const allRanges = generateRanges('Hello', marker2, [[6, 11]], undefined, existingRanges);

            strictEqual(allRanges, existingRanges); // Same array reference
            deepStrictEqual(allRanges, [
                { type: marker1, start: 0, end: 5, data: undefined },
                { type: marker2, start: 6, end: 11, data: undefined }
            ]);
        });

        it('should pass render options to generator function', () => {
            const ranges = generateRanges('Hello world', 'test', (_, createRange, options) => {
                createRange(0, 0, options);
            }, { threshold: 3 });

            deepStrictEqual(ranges[0].data, { threshold: 3 });
        });

        it('should handle mixed tuple and object format', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                [
                    [0, 5],
                    { start: 6, end: 11 }
                ]
            );

            deepStrictEqual(ranges, [
                { type: marker, start: 0, end: 5, data: undefined },
                { type: marker, start: 6, end: 11, data: undefined }
            ]);
        });
    });

    describe('generateRangesFromLayers', () => {
        it('should generate ranges from multiple layers', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const ranges = generateRangesFromLayers('Hello world', [
                {
                    marker: marker1,
                    ranges: [[0, 5]]
                },
                {
                    marker: marker2,
                    ranges: [[6, 11]]
                }
            ]);

            deepStrictEqual(ranges, [
                { type: marker1, start: 0, end: 5, data: undefined },
                { type: marker2, start: 6, end: 11, data: undefined }
            ]);
        });

        it('should handle generator functions in layers', () => {
            const input = 'Hello world';
            const marker = Symbol('words');
            const ranges = generateRangesFromLayers(input, [
                {
                    marker,
                    ranges: rangeMatch(/\w+/g)
                }
            ]);

            deepStrictEqual(ranges, [
                { type: marker, start: 0, end: 5, data: regexpMatch(input, ['Hello'], 0) },
                { type: marker, start: 6, end: 11, data: regexpMatch(input, ['world'], 6) }
            ]);
        });

        it('should pass render options to all generators', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const ranges = generateRangesFromLayers('Hello', [
                { marker: marker1, ranges: (_, createRange, options) =>
                    createRange(0, 1, options)
                },
                { marker: marker2, ranges: (_, createRange, options) =>
                    createRange(1, 2, options)
                }
            ], { setting: 'test' });

            deepStrictEqual(ranges, [
                { type: marker1, start: 0, end: 1, data: { setting: 'test' } },
                { type: marker2, start: 1, end: 2, data: { setting: 'test' } }
            ]);
        });

        it('should accumulate ranges from all layers', () => {
            const input = 'Hello world';
            const marker1 = Symbol('all');
            const marker2 = Symbol('words');
            const marker3 = Symbol('specific');

            const ranges = generateRangesFromLayers(input, [
                { marker: marker1, ranges: [[0, 11] as [number, number]] },
                { marker: marker2, ranges: rangeMatch(/\w+/g) },
                { marker: marker3, ranges: [[0, 5] as [number, number]] }
            ]);

            deepStrictEqual(ranges, [
                { type: marker1, start: 0, end: 11, data: undefined },
                { type: marker2, start: 0, end: 5, data: regexpMatch(input, ['Hello'], 0) },
                { type: marker2, start: 6, end: 11, data: regexpMatch(input, ['world'], 6) },
                { type: marker3, start: 0, end: 5, data: undefined }
            ]);
        });

        it('should handle empty layers', () => {
            const ranges = generateRangesFromLayers('Hello world', []);

            deepStrictEqual(ranges, []);
        });

        it('should handle layers with empty ranges', () => {
            const marker = Symbol('empty');
            const layers = [{ marker, ranges: [] as [] }];
            const ranges = generateRangesFromLayers('Hello world', layers);

            deepStrictEqual(ranges, []);
        });

        it('should preserve data in generated ranges', () => {
            const marker1 = Symbol('with-data');
            const marker2 = Symbol('without-data');
            const ranges = generateRangesFromLayers('Hello world', [
                {
                    marker: marker1,
                    ranges: [{ start: 0, end: 5, data: { type: 'greeting' } }]
                },
                {
                    marker: marker2,
                    ranges: [[6, 11]]
                }
            ]);

            deepStrictEqual(ranges, [
                { type: marker1, start: 0, end: 5, data: { type: 'greeting' } },
                { type: marker2, start: 6, end: 11, data: undefined }
            ]);
        });
    });

    describe('integration', () => {
        it('should work with built-in generators', () => {
            const marker = Symbol('matches');
            const ranges = generateRanges(
                'ERROR: Something went wrong. WARNING: Check logs.',
                marker,
                rangeMatch(/ERROR|WARNING/g)
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 5], [29, 36]]);
        });

        it('should support custom generator with options', () => {
            interface CustomOptions {
                minLength: number;
            }

            const marker = Symbol('filtered');
            const filterByLength: GenerateRanges<string, CustomOptions> = (source, createRange, options) => {
                const minLength = options?.minLength || 0;
                const words = source.match(/\w+/g) || [];
                let offset = 0;

                for (const word of words) {
                    const index = source.indexOf(word, offset);
                    if (word.length >= minLength) {
                        createRange(index, index + word.length, word);
                    }
                    offset = index + word.length;
                }
            };

            const ranges = generateRanges(
                'a to the world',
                marker,
                filterByLength,
                { minLength: 3 }
            );

            // Only "the" and "world"
            deepStrictEqual(ranges, [
                { type: marker, start: 5, end: 8, data: 'the' },
                { type: marker, start: 9, end: 14, data: 'world' }
            ]);
        });
    });

    describe('rangeMerge', () => {
        it('should merge overlapping ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([[0, 5], [3, 8], [6, 11]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 11]]);
        });

        it('should merge adjacent ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([[0, 5], [5, 11]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 11]]);
        });

        it('should not merge non-overlapping ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([[0, 5], [6, 11]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 5], [6, 11]]);
        });

        it('should handle single range', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([[0, 5]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 5]]);
        });

        it('should handle empty ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([])
            );

            deepStrictEqual(ranges, []);
        });

        it('should sort ranges before merging', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([[6, 11], [0, 5], [3, 8]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 11]]);
        });

        it('should handle nested ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge([[0, 11], [3, 8]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 11]]);
        });

        it('should work with generator function input', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeMerge(rangeMatch(/\w+/g))
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 5], [6, 11]]);
        });
    });

    describe('rangeInvert', () => {
        it('should invert single range at start', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([[0, 5]])
            );

            deepStrictEqual(startEndPairs(ranges), [[5, 11]]);
        });

        it('should invert single range at end', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([[6, 11]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 6]]);
        });

        it('should invert single range in middle', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([[3, 8]])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 3], [8, 11]]);
        });

        it('should invert multiple ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([[0, 5], [6, 11]])
            );

            deepStrictEqual(startEndPairs(ranges), [[5, 6]]);
        });

        it('should handle empty ranges (return full source)', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([])
            );

            deepStrictEqual(startEndPairs(ranges), [[0, 11]]);
        });

        it('should handle full range (return empty)', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([[0, 11]])
            );

            deepStrictEqual(ranges, []);
        });

        it('should merge overlapping ranges before inverting', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert([[0, 5], [3, 8]])
            );

            // Merged [0, 8], inverted to [8, 11]
            deepStrictEqual(startEndPairs(ranges), [[8, 11]]);
        });

        it('should work with generator function input', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                'Hello world',
                marker,
                rangeInvert(rangeMatch(/\w+/g))
            );

            // Words are at [0, 5] and [6, 11], inverted to [5, 6]
            deepStrictEqual(startEndPairs(ranges), [[5, 6]]);
        });
    });

    describe('rangeExpandToLines', () => {
        const source = 'line1\nline2\nline3\nline4\nline5';
        // Line boundaries: [0,6), [6,12), [12,18), [18,24), [24,29]

        it('should expand range to its line boundaries (no context)', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[7, 9]]) // "in" from "line2"
            );

            // Should expand to full line2: [6, 12)
            deepStrictEqual(startEndPairs(ranges), [[6, 12]]);
        });

        it('should expand range with 1 line context', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[7, 9]], 1) // "in" from "line2"
            );

            // Should expand to line1-3: [0, 18)
            deepStrictEqual(startEndPairs(ranges), [[0, 18]]);
        });

        it('should expand range with 2 lines context', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[13, 15]], 2) // "ne" from "line3"
            );

            // Should expand to line1-5: [0, 29)
            deepStrictEqual(startEndPairs(ranges), [[0, 29]]);
        });

        it('should merge adjacent expanded ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[1, 2], [7, 8]], 0) // chars in line1 and line2
            );

            // Line1 [0,6) and line2 [6,12) are adjacent, should merge
            deepStrictEqual(startEndPairs(ranges), [[0, 12]]);
        });

        it('should merge when context causes overlap', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[1, 2], [13, 14]], 1) // line1 and line3
            );

            // With 1 line context: line1±1 = [0,12), line3±1 = [6,18)
            // Overlapping at [6,12), so merged to [0, 18)
            // But actually: line1 char1 with context = lines 0-2 = [0,18)
            // line3 char13 with context = lines 2-4 = [12,24)
            // These overlap so merge to [0,24)
            deepStrictEqual(startEndPairs(ranges), [[0, 24]]);
        });

        it('should handle ranges at document start', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[0, 2]], 1)
            );

            // Can't go before start, expands to [0, 12)
            deepStrictEqual(startEndPairs(ranges), [[0, 12]]);
        });

        it('should handle ranges at document end', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[27, 29]], 1)
            );

            // Can't go past end, expands to [18, 29)
            deepStrictEqual(startEndPairs(ranges), [[18, 29]]);
        });

        it('should handle empty ranges', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([])
            );

            deepStrictEqual(ranges, []);
        });

        it('should handle range spanning multiple lines', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines([[1, 14]], 0) // spans line1-3
            );

            // Should expand to [0, 18)
            deepStrictEqual(startEndPairs(ranges), [[0, 18]]);
        });

        it('should work with \\r line endings', () => {
            const crSource = 'line1\rline2\rline3';
            const marker = Symbol('test');
            const ranges = generateRanges(
                crSource,
                marker,
                rangeExpandToLines([[7, 9]], 0)
            );

            deepStrictEqual(startEndPairs(ranges), [[6, 12]]);
        });

        it('should work with \\r\\n line endings', () => {
            const crlfSource = 'line1\r\nline2\r\nline3';
            const marker = Symbol('test');
            const ranges = generateRanges(
                crlfSource,
                marker,
                rangeExpandToLines([[8, 10]], 0)
            );

            deepStrictEqual(startEndPairs(ranges), [[7, 14]]);
        });

        it('should work with mixed line endings', () => {
            const mixedSource = 'line1\nline2\r\nline3\rline4';
            const marker = Symbol('test');
            const ranges = generateRanges(
                mixedSource,
                marker,
                rangeExpandToLines([[8, 10]], 0)
            );

            // Position 8-10 is in line2 (6-13), so should expand to [6, 13]
            deepStrictEqual(startEndPairs(ranges), [[6, 13]]);
        });

        it('should work with generator function input', () => {
            const marker = Symbol('test');
            const ranges = generateRanges(
                source,
                marker,
                rangeExpandToLines(rangeMatch(/line2/g), 0)
            );

            // "line2" match expands to full line2
            deepStrictEqual(startEndPairs(ranges), [[6, 12]]);
        });

        it('should handle viewport use case', () => {
            const source2 = 'a\nb\nc\nd\ne\nf\ng\nh';
            const marker = Symbol('test');
            // Show only lines with 'c' and 'f' with 1 line context
            const matches: [number, number][] = [[4, 5], [10, 11]]; // 'c' and 'f'
            const ranges = generateRanges(
                source2,
                marker,
                rangeExpandToLines(matches, 1)
            );

            // 'c' is line3, with context = lines 2-4 [2, 8)
            // 'f' is line6, with context = lines 5-7 [8, 14)
            // Adjacent, should merge to [2, 14)
            deepStrictEqual(startEndPairs(ranges), [[2, 14]]);
        });
    });
});

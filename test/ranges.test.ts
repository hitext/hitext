import { strictEqual, deepStrictEqual } from 'assert';
import { generateRanges, generateRangesFromLayers, rangeMatch } from '../src/index.js';
import type { GenerateRanges, GeneratedRange } from '../src/types.d.js';

const startEndPairs = (ranges: GeneratedRange[]) => ranges.map(r => [r.start, r.end]);

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
            const marker = Symbol('words');
            const ranges = generateRangesFromLayers('Hello world', [
                {
                    marker,
                    ranges: rangeMatch(/\w+/g)
                }
            ]);

            deepStrictEqual(ranges, [
                { type: marker, start: 0, end: 5, data: undefined },
                { type: marker, start: 6, end: 11, data: undefined }
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
            const marker1 = Symbol('all');
            const marker2 = Symbol('words');
            const marker3 = Symbol('specific');

            const ranges = generateRangesFromLayers('Hello world', [
                { marker: marker1, ranges: [[0, 11] as [number, number]] },
                { marker: marker2, ranges: rangeMatch(/\w+/g) },
                { marker: marker3, ranges: [[0, 5] as [number, number]] }
            ]);

            deepStrictEqual(ranges, [
                { type: marker1, start: 0, end: 11, data: undefined },
                { type: marker2, start: 0, end: 5, data: undefined },
                { type: marker2, start: 6, end: 11, data: undefined },
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
});

import { deepEqual, equal } from 'assert';
import { generateRanges, generateRangesFromLayers, rangeMatch } from '../src/index.js';
import type { GenerateRanges } from '../src/types.d.js';

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

            deepEqual(ranges, [
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

            deepEqual(ranges, [
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

            deepEqual(ranges, [
                { type: marker, start: 0, end: 5, data: 'Hello' },
                { type: marker, start: 6, end: 11, data: 'world' }
            ]);
        });

        it('should append to existing ranges array', () => {
            const marker1 = Symbol('test1');
            const marker2 = Symbol('test2');

            const existingRanges = generateRanges('Hello', marker1, [[0, 5]]);
            const allRanges = generateRanges('Hello', marker2, [[6, 11]], undefined, existingRanges);

            equal(allRanges, existingRanges); // Same array reference
            deepEqual(allRanges, [
                { type: marker1, start: 0, end: 5, data: undefined },
                { type: marker2, start: 6, end: 11, data: undefined }
            ]);
        });

        it('should pass render options to generator function', () => {
            const marker = Symbol('test');
            let capturedOptions: any;

            const generator: GenerateRanges<any, { threshold: number }> = (source, createRange, options) => {
                capturedOptions = options;
                if (options?.threshold) {
                    createRange(0, options.threshold);
                }
            };

            generateRanges('Hello world', marker, generator, { threshold: 3 });

            deepEqual(capturedOptions, { threshold: 3 });
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

            equal(ranges.length, 2);
            equal(ranges[0].start, 0);
            equal(ranges[1].start, 6);
        });
    });

    describe('generateRangesFromLayers', () => {
        it('should generate ranges from multiple layers', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');

            const layers = [
                {
                    marker: marker1,
                    ranges: [[0, 5] as [number, number]]
                },
                {
                    marker: marker2,
                    ranges: [[6, 11] as [number, number]]
                }
            ];

            const ranges = generateRangesFromLayers('Hello world', layers);

            deepEqual(ranges, [
                { type: marker1, start: 0, end: 5, data: undefined },
                { type: marker2, start: 6, end: 11, data: undefined }
            ]);
        });

        it('should handle generator functions in layers', () => {
            const marker = Symbol('words');

            const layers = [
                {
                    marker,
                    ranges: rangeMatch(/\w+/g)
                }
            ];

            const ranges = generateRangesFromLayers('Hello world', layers);

            equal(ranges.length, 2);
            equal(ranges[0].type, marker);
            equal(ranges[0].start, 0);
            equal(ranges[0].end, 5);
            equal(ranges[1].start, 6);
            equal(ranges[1].end, 11);
        });

        it('should pass render options to all generators', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const capturedOptions: any[] = [];

            const generator1: GenerateRanges<any, { setting: string }> = (source, createRange, options) => {
                capturedOptions.push(options);
                createRange(0, 1);
            };

            const generator2: GenerateRanges<any, { setting: string }> = (source, createRange, options) => {
                capturedOptions.push(options);
                createRange(1, 2);
            };

            const layers = [
                { marker: marker1, ranges: generator1 },
                { marker: marker2, ranges: generator2 }
            ];

            generateRangesFromLayers('Hello', layers, { setting: 'test' });

            equal(capturedOptions.length, 2);
            deepEqual(capturedOptions[0], { setting: 'test' });
            deepEqual(capturedOptions[1], { setting: 'test' });
        });

        it('should accumulate ranges from all layers', () => {
            const marker1 = Symbol('all');
            const marker2 = Symbol('words');
            const marker3 = Symbol('specific');

            const layers = [
                { marker: marker1, ranges: [[0, 11] as [number, number]] },
                { marker: marker2, ranges: rangeMatch(/\w+/g) },
                { marker: marker3, ranges: [[0, 5] as [number, number]] }
            ];

            const ranges = generateRangesFromLayers('Hello world', layers);

            equal(ranges.length, 4); // 1 from layer1 + 2 from layer2 + 1 from layer3

            // Check markers
            equal(ranges[0].type, marker1);
            equal(ranges[1].type, marker2);
            equal(ranges[2].type, marker2);
            equal(ranges[3].type, marker3);
        });

        it('should handle empty layers', () => {
            const ranges = generateRangesFromLayers('Hello world', []);
            deepEqual(ranges, []);
        });

        it('should handle layers with no ranges', () => {
            const marker = Symbol('empty');

            const layers = [
                { marker, ranges: [] as [] }
            ];

            const ranges = generateRangesFromLayers('Hello world', layers);
            deepEqual(ranges, []);
        });

        it('should preserve data in generated ranges', () => {
            const marker1 = Symbol('with-data');
            const marker2 = Symbol('without-data');

            const layers = [
                {
                    marker: marker1,
                    ranges: [
                        { start: 0, end: 5, data: { type: 'greeting' } }
                    ]
                },
                {
                    marker: marker2,
                    ranges: [[6, 11] as [number, number]]
                }
            ];

            const ranges = generateRangesFromLayers('Hello world', layers);

            deepEqual(ranges[0].data, { type: 'greeting' });
            equal(ranges[1].data, undefined);
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

            equal(ranges.length, 2);
            equal(ranges[0].start, 0);
            equal(ranges[0].end, 5); // "ERROR"
            equal(ranges[1].start, 29);
            equal(ranges[1].end, 36); // "WARNING"
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

            equal(ranges.length, 2); // Only "the" and "world"
            equal(ranges[0].data, 'the');
            equal(ranges[1].data, 'world');
        });
    });
});

import { strictEqual, deepStrictEqual } from 'assert';
import {
    generateSpans,
    generateSpansFromLayers,
    processSpans,
    spansFromMatch
} from '../src/index.js';
import type { GenerateSpans, GeneratedSpan } from '../src/types.js';
import { regexpMatch } from './utils.js';

const startEndPairs = (spans: GeneratedSpan[]) => spans.map(r => [r.start, r.end]);

describe('Span Generation Helpers', () => {
    describe('processSpans', () => {
        it('should process spans from array of tuples', () => {
            const collected: Array<[number, number, any?]> = [];

            processSpans(
                'Hello world',
                [
                    [0, 5],
                    [6, 11, 'extra']
                ],
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, undefined],
                [6, 11, 'extra']
            ]);
        });

        it('should process spans from array of objects', () => {
            const collected: Array<[number, number, any?]> = [];

            processSpans(
                'Hello world',
                [
                    { start: 0, end: 5 },
                    { start: 6, end: 11, data: { type: 'word' } }
                ],
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, undefined],
                [6, 11, { type: 'word' }]
            ]);
        });

        it('should process spans from generator function', () => {
            const collected: Array<[number, number, any?]> = [];
            const generator: GenerateSpans = (document, createSpan) => {
                const words = document.split(/\s+/);
                let offset = 0;

                for (const word of words) {
                    const index = document.indexOf(word, offset);
                    if (index !== -1) {
                        createSpan(index, index + word.length, word);
                        offset = index + word.length;
                    }
                }
            };

            processSpans(
                'Hello world',
                generator,
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, 'Hello'],
                [6, 11, 'world']
            ]);
        });

        it('should pass render options to generator function', () => {
            const collected: any[] = [];

            processSpans(
                'Hello world',
                (_, createSpan, context) => {
                    createSpan(0, 5, context?.renderOptions);
                },
                (start, end, data) => {
                    collected.push(data);
                },
                { renderOptions: { threshold: 42 } }
            );

            deepStrictEqual(collected, [{ threshold: 42 }]);
        });

        it('should handle empty array', () => {
            const collected: any[] = [];

            processSpans(
                'Hello world',
                [],
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, []);
        });

        it('should handle mixed tuple and object format', () => {
            const collected: Array<[number, number, any?]> = [];

            processSpans(
                'Hello world',
                [
                    [0, 5],
                    { start: 6, end: 11 }
                ],
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, undefined],
                [6, 11, undefined]
            ]);
        });

        it('should work with built-in generators', () => {
            const collected: string[] = [];

            processSpans(
                'ERROR: Something went wrong. WARNING: Check logs.',
                spansFromMatch(/ERROR|WARNING/g),
                (start, end) => {
                    collected.push('ERROR: Something went wrong. WARNING: Check logs.'.slice(start, end));
                }
            );

            deepStrictEqual(collected, ['ERROR', 'WARNING']);
        });

        it('should allow side effects in createSpan callback', () => {
            const document = 'Hello world';
            const substrings: string[] = [];

            processSpans(
                document,
                [[0, 5], [6, 11]],
                (start, end) => {
                    substrings.push(document.slice(start, end));
                }
            );

            deepStrictEqual(substrings, ['Hello', 'world']);
        });

        it('should not create GeneratedSpan objects', () => {
            const collected: any[] = [];

            processSpans(
                'Hello world',
                [[0, 5]],
                (start, end, data) => {
                    collected.push({ start, end, data });
                }
            );

            // Should not have 'type' property
            deepStrictEqual(collected, [
                { start: 0, end: 5, data: undefined }
            ]);
            strictEqual('type' in collected[0], false);
        });

        it('should process spans from Set iterable', () => {
            const collected: Array<[number, number, any?]> = [];
            const spanSet = new Set<[number, number, string?]>([
                [0, 5],
                [6, 11, 'data']
            ]);

            processSpans(
                'Hello world',
                spanSet,
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, undefined],
                [6, 11, 'data']
            ]);
        });

        it('should process spans from Map.values() iterable', () => {
            const collected: Array<[number, number, any?]> = [];
            const spanMap = new Map([
                ['first', { start: 0, end: 5 }],
                ['second', { start: 6, end: 11, data: 'world' }]
            ]);

            processSpans(
                'Hello world',
                spanMap.values(),
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, undefined],
                [6, 11, 'world']
            ]);
        });

        it('should process spans from custom iterable', () => {
            const collected: Array<[number, number, any?]> = [];

            // Custom iterable that yields spans
            const customIterable = {
                *[Symbol.iterator]() {
                    yield[0, 5] as [number, number];
                    yield{ start: 6, end: 11, data: 'custom' };
                }
            };

            processSpans(
                'Hello world',
                customIterable,
                (start, end, data) => {
                    collected.push([start, end, data]);
                }
            );

            deepStrictEqual(collected, [
                [0, 5, undefined],
                [6, 11, 'custom']
            ]);
        });

        it('should process spans from generator result', () => {
            const collected: string[] = [];

            function* generateSpans(document: string) {
                const words = document.split(/\s+/);
                let offset = 0;

                for (const word of words) {
                    const index = document.indexOf(word, offset);
                    if (index !== -1) {
                        yield[index, index + word.length, word] as [number, number, string];
                        offset = index + word.length;
                    }
                }
            }

            processSpans(
                'Hello world',
                generateSpans('Hello world'),
                (start, end, data) => {
                    collected.push(data as string);
                }
            );

            deepStrictEqual(collected, ['Hello', 'world']);
        });
    });

    describe('generateSpans', () => {
        it('should generate spans from array of tuples', () => {
            const marker = Symbol('test');
            const spans = generateSpans(
                'Hello world',
                [
                    [0, 5],
                    [6, 11, 'extra']
                ],
                { marker }
            );

            deepStrictEqual(spans, [
                { type: marker, start: 0, end: 5, data: undefined, origin: undefined },
                { type: marker, start: 6, end: 11, data: 'extra', origin: undefined }
            ]);
        });

        it('should generate spans from array of objects', () => {
            const marker = Symbol('test');
            const spans = generateSpans(
                'Hello world',
                [
                    { start: 0, end: 5 },
                    { start: 6, end: 11, data: { type: 'word' } }
                ],
                { marker }
            );

            deepStrictEqual(spans, [
                { type: marker, start: 0, end: 5, data: undefined, origin: undefined },
                { type: marker, start: 6, end: 11, data: { type: 'word' }, origin: undefined }
            ]);
        });

        it('should generate spans from generator function', () => {
            const marker = Symbol('test');
            const generator: GenerateSpans = (document, createSpan) => {
                const words = document.split(/\s+/);
                let offset = 0;

                for (const word of words) {
                    const index = document.indexOf(word, offset);
                    if (index !== -1) {
                        createSpan(index, index + word.length, word);
                        offset = index + word.length;
                    }
                }
            };

            const spans = generateSpans('Hello world', generator, { marker });

            deepStrictEqual(spans, [
                { type: marker, start: 0, end: 5, data: 'Hello', origin: undefined },
                { type: marker, start: 6, end: 11, data: 'world', origin: undefined }
            ]);
        });

        it('should not append to context spans array', () => {
            const marker1 = Symbol('test1');
            const marker2 = Symbol('test2');

            const existingSpans = generateSpans('Hello', [[0, 5]], { marker: marker1 });
            const allSpans = generateSpans('Hello', [[6, 11]], { marker: marker2, spans: existingSpans });

            // strictEqual(allSpans, existingSpans); // Same array reference
            deepStrictEqual(allSpans, [
                // { type: marker1, start: 0, end: 5, data: undefined, origin: undefined },
                { type: marker2, start: 6, end: 11, data: undefined, origin: undefined }
            ]);
        });

        it('should pass render options to generator function', () => {
            const spans = generateSpans('Hello world', (_, createSpan, context) => {
                createSpan(0, 0, context?.renderOptions);
            }, { renderOptions: { threshold: 3 } });

            deepStrictEqual(spans[0].data, { threshold: 3 });
        });

        it('should handle mixed tuple and object format', () => {
            const marker = Symbol('test');
            const spans = generateSpans(
                'Hello world',
                [
                    [0, 5],
                    { start: 6, end: 11 }
                ],
                { marker }
            );

            deepStrictEqual(spans, [
                { type: marker, start: 0, end: 5, data: undefined, origin: undefined },
                { type: marker, start: 6, end: 11, data: undefined, origin: undefined }
            ]);
        });

        it('should safely handle non-iterable values', () => {
            const marker = Symbol('test');

            // Should not crash with null
            const spans1 = generateSpans('Hello', null as any, { marker });
            deepStrictEqual(spans1, []);

            // Should not crash with undefined
            const spans2 = generateSpans('Hello', undefined as any, { marker });
            deepStrictEqual(spans2, []);

            // Should not crash with plain object (no Symbol.iterator)
            const spans3 = generateSpans('Hello', { start: 0, end: 5 } as any, { marker });
            deepStrictEqual(spans3, []);

            // Should not crash with number
            const spans4 = generateSpans('Hello', 123 as any, { marker });
            deepStrictEqual(spans4, []);

            // Should not crash with string (though strings are iterable, they don't match the expected format)
            const spans5 = generateSpans('Hello', 'test' as any, { marker });
            deepStrictEqual(spans5, []);
        });
    });

    describe('generateSpansFromLayers', () => {
        it('should generate spans from multiple layers', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const spans = generateSpansFromLayers('Hello world', [
                {
                    marker: marker1,
                    spans: [[0, 5]]
                },
                {
                    marker: marker2,
                    spans: [[6, 11]]
                }
            ]);

            deepStrictEqual(spans, [
                { type: marker1, start: 0, end: 5, data: undefined, origin: undefined },
                { type: marker2, start: 6, end: 11, data: undefined, origin: undefined }
            ]);
        });

        it('should handle generator functions in layers', () => {
            const input = 'Hello world';
            const marker = Symbol('words');
            const spans = generateSpansFromLayers(input, [
                {
                    marker,
                    spans: spansFromMatch(/\w+/g)
                }
            ]);

            deepStrictEqual(spans, [
                { type: marker, start: 0, end: 5, data: regexpMatch(input, ['Hello'], 0), origin: undefined },
                { type: marker, start: 6, end: 11, data: regexpMatch(input, ['world'], 6), origin: undefined }
            ]);
        });

        it('should pass render options to all generators', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const spans = generateSpansFromLayers('Hello', [
                { marker: marker1, spans: (_, createSpan, context) =>
                    createSpan(0, 1, context?.renderOptions)
                },
                { marker: marker2, spans: (_, createSpan, context) =>
                    createSpan(1, 2, context?.renderOptions)
                }
            ], { setting: 'test' });

            deepStrictEqual(spans, [
                { type: marker1, start: 0, end: 1, data: { setting: 'test' }, origin: undefined },
                { type: marker2, start: 1, end: 2, data: { setting: 'test' }, origin: undefined }
            ]);
        });

        it('should accumulate spans from all layers', () => {
            const input = 'Hello world';
            const marker1 = Symbol('all');
            const marker2 = Symbol('words');
            const marker3 = Symbol('specific');

            const spans = generateSpansFromLayers(input, [
                { marker: marker1, spans: [[0, 11] as [number, number]] },
                { marker: marker2, spans: spansFromMatch(/\w+/g) },
                { marker: marker3, spans: [[0, 5] as [number, number]] }
            ]);

            deepStrictEqual(spans, [
                { type: marker1, start: 0, end: 11, data: undefined, origin: undefined },
                { type: marker2, start: 0, end: 5, data: regexpMatch(input, ['Hello'], 0), origin: undefined },
                { type: marker2, start: 6, end: 11, data: regexpMatch(input, ['world'], 6), origin: undefined },
                { type: marker3, start: 0, end: 5, data: undefined, origin: undefined }
            ]);
        });

        it('should handle empty layers', () => {
            const spans = generateSpansFromLayers('Hello world', []);

            deepStrictEqual(spans, []);
        });

        it('should handle layers with empty spans', () => {
            const marker = Symbol('empty');
            const layers = [{ marker, spans: [] as [] }];
            const spans = generateSpansFromLayers('Hello world', layers);

            deepStrictEqual(spans, []);
        });

        it('should preserve data in generated spans', () => {
            const marker1 = Symbol('with-data');
            const marker2 = Symbol('without-data');
            const spans = generateSpansFromLayers('Hello world', [
                {
                    marker: marker1,
                    spans: [{ start: 0, end: 5, data: { type: 'greeting' } }]
                },
                {
                    marker: marker2,
                    spans: [[6, 11]]
                }
            ]);

            deepStrictEqual(spans, [
                { type: marker1, start: 0, end: 5, data: { type: 'greeting' }, origin: undefined },
                { type: marker2, start: 6, end: 11, data: undefined, origin: undefined }
            ]);
        });
    });

    describe('integration', () => {
        it('should preserve falsy span markers', () => {
            const zeroMarker = generateSpans('a', [[0, 1]], { marker: 0 });
            const emptyMarker = generateSpans('a', [[0, 1]], { marker: '' });

            deepStrictEqual(zeroMarker[0].type, 0);
            deepStrictEqual(emptyMarker[0].type, '');
        });

        it('should work with built-in generators', () => {
            const spans = generateSpans(
                'ERROR: Something went wrong. WARNING: Check logs.',
                spansFromMatch(/ERROR|WARNING/g)
            );

            deepStrictEqual(startEndPairs(spans), [[0, 5], [29, 36]]);
        });

        it('should support custom generator with options', () => {
            interface CustomOptions {
                minLength: number;
            }

            const marker = Symbol('filtered');
            const filterByLength: GenerateSpans<string, CustomOptions> = (document, createSpan, context) => {
                const minLength = context?.renderOptions?.minLength || 0;
                const words = document.match(/\w+/g) || [];
                let offset = 0;

                for (const word of words) {
                    const index = document.indexOf(word, offset);
                    if (word.length >= minLength) {
                        createSpan(index, index + word.length, word);
                    }
                    offset = index + word.length;
                }
            };

            const spans = generateSpans(
                'a to the world',
                filterByLength,
                { marker, renderOptions: { minLength: 3 } }
            );

            // Only "the" and "world"
            deepStrictEqual(spans, [
                { type: marker, start: 5, end: 8, data: 'the', origin: undefined },
                { type: marker, start: 9, end: 14, data: 'world', origin: undefined }
            ]);
        });
    });
});

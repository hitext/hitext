import { deepStrictEqual } from 'assert';
import { rangeFromLayer, rangeMatch, string, generateRanges } from '../../src/index.js';
import { rangeWithoutMarker, regexpMatch } from '../utils.js';
import type { GeneratedRange } from '../../src/types.js';

describe('rangeFromLayer', () => {
    describe('with generateRanges', () => {
        it('should retrieve ranges from a named layer', () => {
            const source = 'hello world';

            // Create some mock ranges as if they came from a previous layer
            const existingRanges: GeneratedRange[] = [
                { type: Symbol('test'), start: 0, end: 5, data: 'hello' },
                { type: Symbol('test'), start: 6, end: 11, data: 'world' }
            ];

            const context = {
                rangesByName: {
                    'words': existingRanges
                }
            };

            const ranges = generateRanges(source, rangeFromLayer('words'), context);

            deepStrictEqual(rangeWithoutMarker(ranges), [
                [0, 5, 'hello', undefined],
                [6, 11, 'world', undefined]
            ]);
        });

        it('should return empty when layer name does not exist', () => {
            const source = 'hello world';
            const context = {
                rangesByName: {}
            };
            const ranges = generateRanges(source, rangeFromLayer('nonexistent'), context);

            deepStrictEqual(rangeWithoutMarker(ranges), []);
        });

        it('should return empty when context has no rangesByName', () => {
            const source = 'hello world';
            const context = {};
            const ranges = generateRanges(source, rangeFromLayer('words'), context);

            deepStrictEqual(rangeWithoutMarker(ranges), []);
        });

        it('should return empty when context is undefined', () => {
            const source = 'hello world';
            const ranges = generateRanges(source, rangeFromLayer('words'));

            deepStrictEqual(rangeWithoutMarker(ranges), []);
        });
    });

    describe('with pipeline', () => {
        it('should reference ranges from a named layer in a pipeline', () => {
            const source = 'error: something failed';
            const result = string()
                .addLayer(rangeMatch(/error/g), null, 'errors')
                .addLayer(rangeFromLayer('errors'), null, 'referenced')
                .ranges(source);

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, regexpMatch(source, ['error'], 0), undefined],
                // layer 'referenced' ranges
                [0, 5, regexpMatch(source, ['error'], 0), undefined]
            ]);
        });

        it('should work with multiple layers referencing each other', () => {
            const source = 'foo bar baz';
            const result = string()
                .addLayer(rangeMatch(/\w+/g), null, 'words')
                .addLayer(rangeFromLayer('words'), null, 'referenced')
                .ranges(source);

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 3, regexpMatch(source, ['foo'], 0), undefined],
                [4, 7, regexpMatch(source, ['bar'], 4), undefined],
                [8, 11, regexpMatch(source, ['baz'], 8), undefined],
                // layer 'referenced' ranges
                [0, 3, regexpMatch(source, ['foo'], 0), undefined],
                [4, 7, regexpMatch(source, ['bar'], 4), undefined],
                [8, 11, regexpMatch(source, ['baz'], 8), undefined]
            ]);
        });

        it('should handle non-existent layer gracefully', () => {
            const source = 'hello world';
            const result = string()
                .addLayer(rangeMatch(/hello/g), null, 'greetings')
                .addLayer(rangeFromLayer('nonexistent'), null, 'referenced')
                .ranges(source);

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, regexpMatch(source, ['hello'], 0), undefined]
            ]);
        });
    });
});

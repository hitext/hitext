import { deepStrictEqual } from 'assert';
import { generateRanges, rangesFromLayer, string } from '../../src/index.js';
import { rangeWithoutMarker } from '../utils.js';
import type { GeneratedRange } from '../../src/types.js';

describe('rangesFromLayer', () => {
    it('should retrieve ranges from a named layer', () => {
        const document = 'hello world';
        const existingRanges: GeneratedRange[] = [
            { type: Symbol('test'), start: 0, end: 5, data: 'hello' },
            { type: Symbol('test'), start: 6, end: 11, data: 'world' }
        ];

        const ranges = generateRanges(
            document,
            rangesFromLayer('words'),
            { rangesByName: { 'words': existingRanges } }
        );

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should return empty when layer does not exist', () => {
        const ranges = generateRanges(
            'hello world',
            rangesFromLayer('nonexistent'),
            { rangesByName: {} }
        );

        deepStrictEqual(rangeWithoutMarker(ranges), []);
    });

    it('should return empty when context has no rangesByName', () => {
        const ranges = generateRanges(
            'hello world',
            rangesFromLayer('words'),
            {}
        );

        deepStrictEqual(rangeWithoutMarker(ranges), []);
    });

    it('should return empty when context is undefined', () => {
        const ranges = generateRanges(
            'hello world',
            rangesFromLayer('words')
        );

        deepStrictEqual(rangeWithoutMarker(ranges), []);
    });

    it('should work in pipeline to reference a layer', () => {
        const result = string()
            .addLayer([[0, 5, 'error']], null, 'errors')
            .addLayer(rangesFromLayer('errors'), null, 'referenced')
            .ranges('error: something failed');

        deepStrictEqual(rangeWithoutMarker(result), [
            [0, 5, 'error', undefined],
            [0, 5, 'error', undefined]  // referenced layer
        ]);
    });

    it('should work with multiple ranges', () => {
        const result = string()
            .addLayer([[0, 3, 'foo'], [4, 7, 'bar'], [8, 11, 'baz']], null, 'words')
            .addLayer(rangesFromLayer('words'), null, 'copy')
            .ranges('foo bar baz');

        deepStrictEqual(rangeWithoutMarker(result), [
            [0, 3, 'foo', undefined],
            [4, 7, 'bar', undefined],
            [8, 11, 'baz', undefined],
            [0, 3, 'foo', undefined],  // copy layer
            [4, 7, 'bar', undefined],
            [8, 11, 'baz', undefined]
        ]);
    });
});

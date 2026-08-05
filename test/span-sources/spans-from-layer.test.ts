import { deepStrictEqual } from 'assert';
import { generateSpans, spansFromLayer, string } from '../../src/index.js';
import { spanWithoutMarker } from '../utils.js';
import type { GeneratedSpan } from '../../src/types.js';

describe('spansFromLayer', () => {
    it('should retrieve spans from a named layer', () => {
        const document = 'hello world';
        const existingSpans: GeneratedSpan[] = [
            { type: Symbol('test'), start: 0, end: 5, data: 'hello' },
            { type: Symbol('test'), start: 6, end: 11, data: 'world' }
        ];

        const spans = generateSpans(
            document,
            spansFromLayer('words'),
            { spansByName: { 'words': existingSpans } }
        );

        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should return empty when layer does not exist', () => {
        const spans = generateSpans(
            'hello world',
            spansFromLayer('nonexistent'),
            { spansByName: {} }
        );

        deepStrictEqual(spanWithoutMarker(spans), []);
    });

    it('should return empty when context has no spansByName', () => {
        const spans = generateSpans(
            'hello world',
            spansFromLayer('words'),
            {}
        );

        deepStrictEqual(spanWithoutMarker(spans), []);
    });

    it('should return empty when context is undefined', () => {
        const spans = generateSpans(
            'hello world',
            spansFromLayer('words')
        );

        deepStrictEqual(spanWithoutMarker(spans), []);
    });

    it('should work in pipeline to reference a layer', () => {
        const result = string()
            .addLayer([[0, 5, 'error']], null, 'errors')
            .addLayer(spansFromLayer('errors'), null, 'referenced')
            .spans('error: something failed');

        deepStrictEqual(spanWithoutMarker(result), [
            [0, 5, 'error', undefined],
            [0, 5, 'error', undefined]  // referenced layer
        ]);
    });

    it('should work with multiple spans', () => {
        const result = string()
            .addLayer([[0, 3, 'foo'], [4, 7, 'bar'], [8, 11, 'baz']], null, 'words')
            .addLayer(spansFromLayer('words'), null, 'copy')
            .spans('foo bar baz');

        deepStrictEqual(spanWithoutMarker(result), [
            [0, 3, 'foo', undefined],
            [4, 7, 'bar', undefined],
            [8, 11, 'baz', undefined],
            [0, 3, 'foo', undefined],  // copy layer
            [4, 7, 'bar', undefined],
            [8, 11, 'baz', undefined]
        ]);
    });
});

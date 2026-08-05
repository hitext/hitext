import { deepStrictEqual } from 'assert';
import { generateSpans, spansFromOptions, string } from '../../src/index.js';
import { spanWithoutMarker } from '../utils.js';

describe('spansFromOptions', () => {
    it('should retrieve spans using callback function', () => {
        const document = 'hello world';
        const spans: Array<[number, number, string]> = [[0, 5, 'hello'], [6, 11, 'world']];

        const result = generateSpans(
            document,
            spansFromOptions((opts: { spans: typeof spans }) => opts.spans),
            { renderOptions: { spans } }
        );

        deepStrictEqual(spanWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should retrieve spans using field name shortcut', () => {
        const document = 'hello world';
        const spans: Array<[number, number, string]> = [[0, 5, 'hello'], [6, 11, 'world']];

        const result = generateSpans(
            document,
            spansFromOptions<string, { spans: typeof spans }>('spans'),
            { renderOptions: { spans } }
        );

        deepStrictEqual(spanWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should return empty when callback returns null', () => {
        const result = generateSpans(
            'hello world',
            spansFromOptions<unknown, { enabled: boolean }>((opts) => opts.enabled ? [[0, 5]] : null),
            { renderOptions: { enabled: false } }
        );

        deepStrictEqual(spanWithoutMarker(result), []);
    });

    it('should return empty when callback returns undefined', () => {
        const result = generateSpans(
            'hello world',
            spansFromOptions<unknown, { pattern?: any }>((opts) => opts.pattern),
            { renderOptions: { pattern: undefined } }
        );

        deepStrictEqual(spanWithoutMarker(result), []);
    });

    it('should return empty when field does not exist', () => {
        const result = generateSpans(
            'hello world',
            spansFromOptions<unknown, { spans?: any }>('spans'),
            { renderOptions: {} }
        );

        deepStrictEqual(spanWithoutMarker(result), []);
    });

    it('should return empty when renderOptions not provided', () => {
        const result = generateSpans(
            'hello world',
            spansFromOptions<unknown, { spans?: any }>('spans'),
            {}
        );

        deepStrictEqual(spanWithoutMarker(result), []);
    });

    it('should return empty when context is undefined', () => {
        const result = generateSpans(
            'hello world',
            spansFromOptions<unknown, { spans?: any }>('spans')
        );

        deepStrictEqual(spanWithoutMarker(result), []);
    });

    it('should preserve falsy render options', () => {
        let received: boolean | undefined;
        generateSpans(
            'hello world',
            spansFromOptions<unknown, boolean>((options) => {
                received = options;
                return [];
            }),
            { renderOptions: false }
        );

        deepStrictEqual(received, false);
    });

    it('should work in pipeline with callback', () => {
        const result = string<{ spans?: any[] }>()
            .addLayer(spansFromOptions((opts) => opts.spans), null)
            .spans('hello world', { spans: [[0, 5, 'hello'], [6, 11, 'world']] });

        deepStrictEqual(spanWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should work in pipeline with field name', () => {
        const result = string<{ spans?: any[] }>()
            .addLayer(spansFromOptions('spans'), null)
            .spans('hello world', { spans: [[0, 5, 'hello'], [6, 11, 'world']] });

        deepStrictEqual(spanWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should work in pipeline with conditional callback', () => {
        const result = string<{ enabled?: boolean }>()
            .addLayer(spansFromOptions((opts) => opts.enabled ? [[0, 5]] : null), null)
            .spans('hello world', { enabled: false });

        deepStrictEqual(spanWithoutMarker(result), []);
    });
});

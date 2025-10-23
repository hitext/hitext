import { deepStrictEqual } from 'assert';
import { generateRanges, rangesFromOptions, string } from '../../src/index.js';
import { rangeWithoutMarker } from '../utils.js';

describe('rangesFromOptions', () => {
    it('should retrieve ranges using callback function', () => {
        const document = 'hello world';
        const ranges: Array<[number, number, string]> = [[0, 5, 'hello'], [6, 11, 'world']];

        const result = generateRanges(
            document,
            rangesFromOptions((opts: { ranges: typeof ranges }) => opts.ranges),
            { renderOptions: { ranges } }
        );

        deepStrictEqual(rangeWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should retrieve ranges using field name shortcut', () => {
        const document = 'hello world';
        const ranges: Array<[number, number, string]> = [[0, 5, 'hello'], [6, 11, 'world']];

        const result = generateRanges(
            document,
            rangesFromOptions<string, { ranges: typeof ranges }>('ranges'),
            { renderOptions: { ranges } }
        );

        deepStrictEqual(rangeWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should return empty when callback returns null', () => {
        const result = generateRanges(
            'hello world',
            rangesFromOptions<unknown, { enabled: boolean }>((opts) => opts.enabled ? [[0, 5]] : null),
            { renderOptions: { enabled: false } }
        );

        deepStrictEqual(rangeWithoutMarker(result), []);
    });

    it('should return empty when callback returns undefined', () => {
        const result = generateRanges(
            'hello world',
            rangesFromOptions<unknown, { pattern?: any }>((opts) => opts.pattern),
            { renderOptions: { pattern: undefined } }
        );

        deepStrictEqual(rangeWithoutMarker(result), []);
    });

    it('should return empty when field does not exist', () => {
        const result = generateRanges(
            'hello world',
            rangesFromOptions<unknown, { ranges?: any }>('ranges'),
            { renderOptions: {} }
        );

        deepStrictEqual(rangeWithoutMarker(result), []);
    });

    it('should return empty when renderOptions not provided', () => {
        const result = generateRanges(
            'hello world',
            rangesFromOptions<unknown, { ranges?: any }>('ranges'),
            {}
        );

        deepStrictEqual(rangeWithoutMarker(result), []);
    });

    it('should return empty when context is undefined', () => {
        const result = generateRanges(
            'hello world',
            rangesFromOptions<unknown, { ranges?: any }>('ranges')
        );

        deepStrictEqual(rangeWithoutMarker(result), []);
    });

    it('should work in pipeline with callback', () => {
        const result = string<{ ranges?: any[] }>()
            .addLayer(rangesFromOptions((opts) => opts.ranges), null)
            .ranges('hello world', { ranges: [[0, 5, 'hello'], [6, 11, 'world']] });

        deepStrictEqual(rangeWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should work in pipeline with field name', () => {
        const result = string<{ ranges?: any[] }>()
            .addLayer(rangesFromOptions('ranges'), null)
            .ranges('hello world', { ranges: [[0, 5, 'hello'], [6, 11, 'world']] });

        deepStrictEqual(rangeWithoutMarker(result), [
            [0, 5, 'hello', undefined],
            [6, 11, 'world', undefined]
        ]);
    });

    it('should work in pipeline with conditional callback', () => {
        const result = string<{ enabled?: boolean }>()
            .addLayer(rangesFromOptions((opts) => opts.enabled ? [[0, 5]] : null), null)
            .ranges('hello world', { enabled: false });

        deepStrictEqual(rangeWithoutMarker(result), []);
    });
});

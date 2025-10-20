import { deepStrictEqual } from 'assert';
import { rangeFromOptions, rangeMatch, string, generateRanges } from '../../src/index.js';
import { rangeWithoutMarker, regexpMatch } from '../utils.js';

describe('rangeFromOptions', () => {
    describe('with generateRanges', () => {
        it('should retrieve ranges from render options using callback', () => {
            const source = 'hello world';
            const ranges: Array<[number, number, string]> = [[0, 5, 'hello'], [6, 11, 'world']];

            const context = {
                renderOptions: { ranges }
            };

            const result = generateRanges(source, rangeFromOptions((opts: { ranges: typeof ranges }) => opts.ranges), context);

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, 'hello', undefined],
                [6, 11, 'world', undefined]
            ]);
        });

        it('should retrieve ranges from render options using field name', () => {
            const source = 'hello world';
            const ranges: Array<[number, number, string]> = [[0, 5, 'hello'], [6, 11, 'world']];

            const context = {
                renderOptions: { ranges }
            };

            const result = generateRanges(source, rangeFromOptions<string, { ranges: typeof ranges }>('ranges'), context);

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, 'hello', undefined],
                [6, 11, 'world', undefined]
            ]);
        });

        it('should return empty when callback returns null', () => {
            const source = 'hello world';
            const context = {
                renderOptions: { enabled: false }
            };

            type RenderOpts = { enabled: boolean };
            const result = generateRanges(
                source,
                rangeFromOptions<unknown, RenderOpts>((opts) => opts.enabled ? [[0, 5]] : null),
                context
            );

            deepStrictEqual(rangeWithoutMarker(result), []);
        });

        it('should return empty when callback returns undefined', () => {
            const source = 'hello world';
            const context = {
                renderOptions: { pattern: undefined }
            };

            type RenderOpts = { pattern?: Array<[number, number]> };
            const result = generateRanges(
                source,
                rangeFromOptions<unknown, RenderOpts>((opts) => opts.pattern),
                context
            );

            deepStrictEqual(rangeWithoutMarker(result), []);
        });

        it('should return empty when render options are not provided', () => {
            const source = 'hello world';
            const context = {};

            const result = generateRanges(source, rangeFromOptions<unknown, { ranges?: any }>('ranges'), context);

            deepStrictEqual(rangeWithoutMarker(result), []);
        });

        it('should return empty when context is undefined', () => {
            const source = 'hello world';

            const result = generateRanges(source, rangeFromOptions<unknown, { ranges?: any }>('ranges'));

            deepStrictEqual(rangeWithoutMarker(result), []);
        });
    });

    describe('with pipeline', () => {
        it('should work with callback returning ranges', () => {
            const source = 'hello world';

            const result = string<{ ranges?: any[] }>()
                .addLayer(rangeFromOptions((opts) => opts.ranges), null)
                .ranges(source, { ranges: [[0, 5, 'hello'], [6, 11, 'world']] });

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, 'hello', undefined],
                [6, 11, 'world', undefined]
            ]);
        });

        it('should work with field name shortcut', () => {
            const source = 'hello world';

            const result = string<{ ranges?: any[] }>()
                .addLayer(rangeFromOptions('ranges'), null)
                .ranges(source, { ranges: [[0, 5, 'hello'], [6, 11, 'world']] });

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, 'hello', undefined],
                [6, 11, 'world', undefined]
            ]);
        });

        it('should work with callback returning range generator', () => {
            const source = 'Hello world';

            const result = string<{ pattern?: RegExp }>()
                .addLayer(rangeFromOptions(({ pattern }) => pattern ? rangeMatch(pattern) : null), null)
                .ranges(source, { pattern: /Hello/ });

            deepStrictEqual(rangeWithoutMarker(result), [
                [0, 5, regexpMatch(source, ['Hello'], 0), undefined]
            ]);
        });

        it('should handle null from callback gracefully', () => {
            const source = 'hello world';

            const result = string<{ enabled?: boolean }>()
                .addLayer(rangeFromOptions((opts) => opts.enabled ? [[0, 5]] : null), null)
                .ranges(source, { enabled: false });

            deepStrictEqual(rangeWithoutMarker(result), []);
        });

        it('should handle undefined from callback gracefully', () => {
            const source = 'hello world';

            const result = string<{ pattern?: RegExp }>()
                .addLayer(rangeFromOptions(({ pattern }) => pattern ? rangeMatch(pattern) : null), null)
                .ranges(source, { pattern: undefined });

            deepStrictEqual(rangeWithoutMarker(result), []);
        });

        it('should handle missing field gracefully', () => {
            const source = 'hello world';

            const result = string<{ ranges?: any[] }>()
                .addLayer(rangeFromOptions('ranges'), null)
                .ranges(source, {});

            deepStrictEqual(rangeWithoutMarker(result), []);
        });

        it('should work without render options', () => {
            const source = 'hello world';

            const result = string<{ ranges?: any[] }>()
                .addLayer(rangeFromOptions('ranges'), null)
                .ranges(source);

            deepStrictEqual(rangeWithoutMarker(result), []);
        });
    });
});

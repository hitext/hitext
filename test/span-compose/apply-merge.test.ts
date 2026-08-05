import { deepStrictEqual } from 'assert';
import { applyMerge, generateSpans } from '../../src/index.js';
import type { GenerateSpans } from '../../src/types.js';
import { renderSpans, spanWithoutMarker } from '../utils.js';

describe('applyMerge', () => {
    it('should merge overlapping spans', () => {
        const merged = renderSpans('Hello world', applyMerge()([[0, 5], [3, 8], [6, 11]]));
        deepStrictEqual(merged, ['Hello world']);
    });

    it('should merge adjacent spans', () => {
        const merged = renderSpans('Hello world', applyMerge()([[0, 5], [5, 11]]));
        deepStrictEqual(merged, ['Hello world']);
    });

    it('should not merge non-overlapping spans', () => {
        const merged = renderSpans('Hello world', applyMerge()([[0, 5], [6, 11]]));
        deepStrictEqual(merged, ['Hello', 'world']);
    });

    it('should sort spans before merging', () => {
        const merged = renderSpans('Hello world', applyMerge()([[6, 11], [0, 5], [3, 8]]));
        deepStrictEqual(merged, ['Hello world']);
    });

    it('should handle chain of overlapping spans', () => {
        const merged = renderSpans(
            '0123456789',
            applyMerge()([[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 10]])
        );
        deepStrictEqual(merged, ['0123456789']);
    });

    it('should handle mix of overlapping and non-overlapping spans', () => {
        const merged = renderSpans(
            '0123456789ABCDEFGHIJ',
            applyMerge()([[0, 3], [2, 5], [7, 9], [8, 12], [15, 18], [17, 20]])
        );
        deepStrictEqual(merged, ['01234', '789AB', 'FGHIJ']);
    });

    it('should merge spans across lines', () => {
        const merged = renderSpans('line1\nline2\nline3', applyMerge()([[0, 6], [6, 12], [12, 17]]));
        deepStrictEqual(merged, ['line1\nline2\nline3']);
    });

    it('should handle empty spans', () => {
        const merged = renderSpans('Hello world', applyMerge()([]));
        deepStrictEqual(merged, []);
    });

    it('should include origins with merged spans', () => {
        const source: GenerateSpans<undefined, unknown> = applyMerge<string, unknown>()([
            [0, 5, 'first'],
            [3, 8, 'second'],
            [6, 11, 'third']
        ]);
        const spans = generateSpans('Hello world', source);
        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 11, undefined, [
                { start: 0, end: 5, data: 'first', origin: undefined },
                { start: 3, end: 8, data: 'second', origin: undefined },
                { start: 6, end: 11, data: 'third', origin: undefined }
            ]]
        ]);
    });

    it('should include origins for non-overlapping spans', () => {
        const spans = generateSpans('Hello world', applyMerge()([[0, 5], [6, 11]]));
        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 5, undefined, [{ start: 0, end: 5, data: undefined, origin: undefined }]],
            [6, 11, undefined, [{ start: 6, end: 11, data: undefined, origin: undefined }]]
        ]);
    });
});

import { deepStrictEqual, strictEqual } from 'assert';
import { applyInvert, generateSpans } from '../../src/index.js';
import type { GenerateSpans } from '../../src/types.js';
import { renderSpans, startEnd } from '../utils.js';

describe('applyInvert', () => {
    it('should invert single span in middle', () => {
        const inverted = renderSpans('Hello world', applyInvert()([[3, 8]]));
        deepStrictEqual(inverted, ['Hel', 'rld']);
    });

    it('should invert multiple spans', () => {
        const inverted = renderSpans('Hello world', applyInvert()([[0, 5], [6, 11]]));
        deepStrictEqual(inverted, [' ']);
    });

    it('should return empty when given empty spans', () => {
        const inverted = renderSpans('Hello world', applyInvert()([]));
        deepStrictEqual(inverted, []);
    });

    it('should return empty when full span is excluded', () => {
        const inverted = renderSpans('Hello world', applyInvert()([[0, 11]]));
        deepStrictEqual(inverted, []);
    });

    it('should merge overlapping spans before inverting', () => {
        const inverted = renderSpans('Hello world', applyInvert()([[0, 5], [3, 8]]));
        deepStrictEqual(inverted, ['rld']);
    });

    it('should sort spans before inverting', () => {
        const inverted = renderSpans('0123456789', applyInvert()([[6, 8], [0, 2], [3, 5]]));
        deepStrictEqual(inverted, ['2', '5', '89']);
    });

    it('should handle alternating spans', () => {
        const inverted = renderSpans(
            'ababababab',
            applyInvert()([[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]])
        );
        deepStrictEqual(inverted, ['b', 'b', 'b', 'b', 'b']);
    });

    it('should invert spans across lines', () => {
        const inverted = renderSpans('line1\nline2\nline3', applyInvert()([[0, 6], [12, 17]]));
        deepStrictEqual(inverted, ['line2\n']);
    });

    it('should use exact boundaries when exact=true', () => {
        const spans = generateSpans('Hello world', applyInvert(true)([[5, 6]]));
        deepStrictEqual(startEnd(spans), [[0, 5], [6, 11]]);
    });

    it('should use extended boundaries when exact=false (default)', () => {
        const spans = generateSpans('Hello world', applyInvert(false)([[5, 6]]));
        deepStrictEqual(startEnd(spans), [[0, 5], [6, 12]]);
    });

    it('should use extended boundaries by default', () => {
        const spans = generateSpans('Hello world', applyInvert()([[5, 6]]));
        deepStrictEqual(startEnd(spans), [[0, 5], [6, 12]]);
    });

    it('should handle span at start with exact=true', () => {
        const spans = generateSpans('Hello world', applyInvert(true)([[0, 5]]));
        deepStrictEqual(startEnd(spans), [[5, 11]]);
    });

    it('should handle span at end with exact=false', () => {
        const spans = generateSpans('Hello world', applyInvert(false)([[6, 11]]));
        deepStrictEqual(startEnd(spans), [[0, 6]]);
    });

    it('should not create origin for inverted spans', () => {
        const source: GenerateSpans<undefined, unknown> = applyInvert<string, unknown>()([
            [0, 5, 'excluded']
        ]);
        const spans = generateSpans('Hello world', source);

        strictEqual(spans[0].data, undefined);
        strictEqual(spans[0].origin, undefined);
    });
});

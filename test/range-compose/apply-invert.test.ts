import { deepStrictEqual, strictEqual } from 'assert';
import { applyInvert, generateRanges } from '../../src/index.js';
import { renderRanges, startEnd } from '../utils.js';

describe('applyInvert', () => {
    it('should invert single range in middle', () => {
        const inverted = renderRanges('Hello world', applyInvert()([[3, 8]]));
        deepStrictEqual(inverted, ['Hel', 'rld']);
    });

    it('should invert multiple ranges', () => {
        const inverted = renderRanges('Hello world', applyInvert()([[0, 5], [6, 11]]));
        deepStrictEqual(inverted, [' ']);
    });

    it('should return full source when given empty ranges', () => {
        const inverted = renderRanges('Hello world', applyInvert()([]));
        deepStrictEqual(inverted, ['Hello world']);
    });

    it('should return empty when full range is excluded', () => {
        const inverted = renderRanges('Hello world', applyInvert()([[0, 11]]));
        deepStrictEqual(inverted, []);
    });

    it('should merge overlapping ranges before inverting', () => {
        const inverted = renderRanges('Hello world', applyInvert()([[0, 5], [3, 8]]));
        deepStrictEqual(inverted, ['rld']);
    });

    it('should sort ranges before inverting', () => {
        const inverted = renderRanges('0123456789', applyInvert()([[6, 8], [0, 2], [3, 5]]));
        deepStrictEqual(inverted, ['2', '5', '89']);
    });

    it('should handle alternating ranges', () => {
        const inverted = renderRanges(
            'ababababab',
            applyInvert()([[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]])
        );
        deepStrictEqual(inverted, ['b', 'b', 'b', 'b', 'b']);
    });

    it('should invert ranges across lines', () => {
        const inverted = renderRanges('line1\nline2\nline3', applyInvert()([[0, 6], [12, 17]]));
        deepStrictEqual(inverted, ['line2\n']);
    });

    it('should use exact boundaries when exact=true', () => {
        const ranges = generateRanges('Hello world', applyInvert(true)([[5, 6]]));
        deepStrictEqual(startEnd(ranges), [[0, 5], [6, 11]]);
    });

    it('should use extended boundaries when exact=false (default)', () => {
        const ranges = generateRanges('Hello world', applyInvert(false)([[5, 6]]));
        deepStrictEqual(startEnd(ranges), [[0, 5], [6, 12]]);
    });

    it('should use extended boundaries by default', () => {
        const ranges = generateRanges('Hello world', applyInvert()([[5, 6]]));
        deepStrictEqual(startEnd(ranges), [[0, 5], [6, 12]]);
    });

    it('should handle range at start with exact=true', () => {
        const ranges = generateRanges('Hello world', applyInvert(true)([[0, 5]]));
        deepStrictEqual(startEnd(ranges), [[5, 11]]);
    });

    it('should handle range at end with exact=false', () => {
        const ranges = generateRanges('Hello world', applyInvert(false)([[6, 11]]));
        deepStrictEqual(startEnd(ranges), [[0, 6]]);
    });

    it('should not create origin for inverted ranges', () => {
        const ranges = generateRanges('Hello world', applyInvert()([[0, 5]]));
        strictEqual(ranges[0].origin, undefined);
    });
});

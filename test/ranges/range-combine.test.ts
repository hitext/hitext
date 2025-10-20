import { deepStrictEqual, strictEqual } from 'assert';
import { rangeCombine, rangeMatch, rangeInvert, generateRanges } from '../../src/index.js';
import { renderRanges } from '../utils.js';

describe('rangeCombine', () => {
    describe('Basic combining', () => {
        it('should combine ranges from multiple sources', () => {
            const combined = renderRanges(
                'ERROR: code 123, WARNING: check logs',
                rangeCombine([
                    rangeMatch(/ERROR/g),
                    rangeMatch(/WARNING/g)
                ])
            );

            // Should have both ERROR and WARNING as separate ranges
            deepStrictEqual(combined, ['ERROR', 'WARNING']);
        });

        it('should preserve all ranges including duplicates', () => {
            const combined = renderRanges(
                'Hello world',
                rangeCombine([
                    [[0, 5]],
                    [[0, 5]],
                    [[6, 11]]
                ])
            );

            // Duplicate [0,5] ranges should both be preserved
            deepStrictEqual(combined, ['Hello', 'Hello', 'world']);
        });

        it('should combine single source', () => {
            const combined = renderRanges(
                'Hello world',
                rangeCombine([
                    rangeMatch(/\w+/g)
                ])
            );

            deepStrictEqual(combined, ['Hello', 'world']);
        });

        it('should handle empty sources', () => {
            const combined = renderRanges(
                'Hello world',
                rangeCombine([])
            );

            deepStrictEqual(combined, []);
        });
    });

    describe('Order preservation', () => {
        it('should preserve order from input sources', () => {
            const source = 'ABC123XYZ789';
            const ranges: Array<[number, number]> = [];

            rangeCombine([
                rangeMatch(/\d+/g),      // 123, 789
                rangeMatch(/[A-Z]+/g)    // ABC, XYZ
            ])(source, (start, end) => {
                ranges.push([start, end]);
            });

            // Order follows input order: digits first (123 at 3, 789 at 9), then letters (ABC at 0, XYZ at 6)
            deepStrictEqual(ranges, [[3, 6], [9, 12], [0, 3], [6, 9]]);
        });

        it('should preserve order with overlapping ranges', () => {
            const source = 'abcdefgh';
            const ranges: Array<[number, number]> = [];

            rangeCombine([
                [[0, 4]],  // abcd
                [[2, 6]]   // cdef
            ])(source, (start, end) => {
                ranges.push([start, end]);
            });

            // Order preserved: first input [0,4], then second input [2,6]
            deepStrictEqual(ranges, [[0, 4], [2, 6]]);
        });

        it('should preserve order regardless of position', () => {
            const source = 'abcdefgh';
            const ranges: Array<[number, number]> = [];

            rangeCombine([
                [[0, 8]],  // abcdefgh
                [[0, 4]],  // abcd
                [[0, 2]]   // ab
            ])(source, (start, end) => {
                ranges.push([start, end]);
            });

            // Order as provided: [0,8], [0,4], [0,2]
            deepStrictEqual(ranges, [[0, 8], [0, 4], [0, 2]]);
        });
    });

    describe('Integration with generators', () => {
        it('should combine multiple regex patterns', () => {
            const combined = renderRanges(
                'Find ERROR1 and WARNING1, then ERROR2 and WARNING2',
                rangeCombine([
                    rangeMatch(/ERROR\d/g),
                    rangeMatch(/WARNING\d/g)
                ])
            );

            // First all ERROR matches, then all WARNING matches
            deepStrictEqual(combined, ['ERROR1', 'ERROR2', 'WARNING1', 'WARNING2']);
        });

        it('should work with three or more sources', () => {
            const combined = renderRanges(
                'ABC 123 xyz',
                rangeCombine([
                    rangeMatch(/[A-Z]+/g),
                    rangeMatch(/\d+/g),
                    rangeMatch(/[a-z]+/g)
                ])
            );

            deepStrictEqual(combined, ['ABC', '123', 'xyz']);
        });

        it('should combine tuple ranges with generator functions', () => {
            const combined = renderRanges(
                'Hello world, test',
                rangeCombine([
                    [[0, 5]],           // Hello
                    rangeMatch(/test/g) // test
                ])
            );

            deepStrictEqual(combined, ['Hello', 'test']);
        });
    });

    describe('Edge cases', () => {
        it('should handle zero-length ranges', () => {
            const combined = renderRanges(
                'Hello',
                rangeCombine([
                    [[0, 0]],
                    [[5, 5]]
                ])
            );

            deepStrictEqual(combined, ['', '']);
        });

        it('should handle ranges at document boundaries', () => {
            const combined = renderRanges(
                'Hello',
                rangeCombine([
                    [[0, 1]],
                    [[4, 5]]
                ])
            );

            deepStrictEqual(combined, ['H', 'o']);
        });

        it('should handle source with no matches', () => {
            const combined = renderRanges(
                'no numbers here',
                rangeCombine([
                    rangeMatch(/\d+/g),
                    rangeMatch(/[A-Z]+/g)
                ])
            );

            deepStrictEqual(combined, []);
        });

        it('should handle one source with matches, others without', () => {
            const combined = renderRanges(
                'hello world',
                rangeCombine([
                    rangeMatch(/\d+/g),      // no matches
                    rangeMatch(/world/g),    // one match
                    rangeMatch(/[A-Z]+/g)    // no matches
                ])
            );

            deepStrictEqual(combined, ['world']);
        });
    });

    describe('Multi-line scenarios', () => {
        it('should combine ranges across multiple lines', () => {
            const combined = renderRanges(
                'line1\n' +
                'ERROR on line2\n' +
                'WARNING on line3',
                rangeCombine([
                    rangeMatch(/ERROR/g),
                    rangeMatch(/WARNING/g)
                ])
            );

            deepStrictEqual(combined, ['ERROR', 'WARNING']);
        });

        it('should preserve order across lines', () => {
            const combined = renderRanges(
                'AAA\n' +
                '111\n' +
                'BBB\n' +
                '222',
                rangeCombine([
                    rangeMatch(/[A-Z]+/g),
                    rangeMatch(/\d+/g)
                ])
            );

            // First all letters (AAA, BBB), then all digits (111, 222)
            deepStrictEqual(combined, ['AAA', 'BBB', '111', '222']);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle many sources with varying numbers of matches', () => {
            const combined = renderRanges(
                'a1b2c3',
                rangeCombine([
                    rangeMatch(/a/g),    // 1 match: a
                    rangeMatch(/\d/g),   // 3 matches: 1, 2, 3
                    rangeMatch(/[bc]/g), // 2 matches: b, c
                    rangeMatch(/x/g)     // 0 matches
                ])
            );

            // Order: a, then 1,2,3, then b,c
            deepStrictEqual(combined, ['a', '1', '2', '3', 'b', 'c']);
        });

        it('should work as input to other generators', () => {
            const source = 'ERROR: code 123, WARNING: check logs';

            // Combine ERROR and WARNING matches, then invert to get everything else
            const inverted = renderRanges(
                source,
                rangeInvert(
                    rangeCombine([
                        rangeMatch(/ERROR/g),
                        rangeMatch(/WARNING/g)
                    ])
                )
            );

            // Should get all text except ERROR and WARNING
            deepStrictEqual(inverted, [': code 123, ', ': check logs']);
        });
    });

    describe('Origin tracking', () => {
        it('should pass through origin when input has no origin', () => {
            const source = 'Hello world';
            const ranges = generateRanges(
                source,
                rangeCombine([
                    [[0, 5]],
                    [[6, 11]]
                ])
            );

            strictEqual(ranges.length, 2);
            strictEqual(ranges[0].origin, undefined);
            strictEqual(ranges[1].origin, undefined);
        });

        it('should preserve origins when inputs have origins', () => {
            const source = 'Hello world';
            const inputsWithOrigins = [
                [{ start: 0, end: 5, data: 'a', origin: { start: 100, end: 105, data: 'orig1' } }],
                [{ start: 6, end: 11, data: 'b', origin: { start: 200, end: 205, data: 'orig2' } }]
            ];
            const ranges = generateRanges(
                source,
                rangeCombine(inputsWithOrigins)
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(ranges[0].origin, { start: 100, end: 105, data: 'orig1' });
            deepStrictEqual(ranges[1].origin, { start: 200, end: 205, data: 'orig2' });
        });
    });
});

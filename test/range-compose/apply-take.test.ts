import { deepStrictEqual } from 'assert';
import { applyTake, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyTake', () => {
    const input = [
        { start: 0, end: 1, data: 0 },
        { start: 1, end: 2, data: 1 },
        { start: 2, end: 3, data: 2 },
        { start: 3, end: 4, data: 3 },
        { start: 4, end: 5, data: 4 }
    ];

    it('should take first N ranges', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>(3)(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2]
        ]);
    });

    it('should take last N ranges', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>(-2)(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [3, 4, 3],
            [4, 5, 4]
        ]);
    });

    it('should take first range with keyword', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>('first')(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 1, 0]
        ]);
    });

    it('should take last range with keyword', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>('last')(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [4, 5, 4]
        ]);
    });

    it('should take all ranges if N is larger than count', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>(10)(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2],
            [3, 4, 3],
            [4, 5, 4]
        ]);
    });

    it('should take zero ranges if N is 0', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>(0)(input)
        );

        deepStrictEqual(ranges, []);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges(
            'test',
            applyTake<undefined, unknown>(5)([])
        );

        deepStrictEqual(ranges, []);
    });

    it('should preserve origins', () => {
        const origin = { start: 100, end: 200, data: 0 };
        const inputWithOrigin = [
            { start: 0, end: 1, data: 0, origin },
            { start: 1, end: 2, data: 1, origin },
            { start: 2, end: 3, data: 2, origin }
        ];

        const ranges = generateRanges(
            'abc',
            applyTake<number, unknown>(2)(inputWithOrigin as any)
        );

        deepStrictEqual(ranges[0].origin, origin);
        deepStrictEqual(ranges[1].origin, origin);
    });

    it('should work with single range input', () => {
        const singleInput = [{ start: 0, end: 5, data: 'test' }];

        const ranges = generateRanges(
            'hello',
            applyTake<string, unknown>('first')(singleInput)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'test']
        ]);
    });

    it('should handle negative N larger than range count', () => {
        const ranges = generateRanges(
            'abcde',
            applyTake<number, unknown>(-10)(input)
        );

        // Should return all ranges
        deepStrictEqual(startEndData(ranges), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2],
            [3, 4, 3],
            [4, 5, 4]
        ]);
    });
});

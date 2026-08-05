import { deepStrictEqual } from 'assert';
import { applyTake, generateSpans } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyTake', () => {
    const input = [
        { start: 0, end: 1, data: 0 },
        { start: 1, end: 2, data: 1 },
        { start: 2, end: 3, data: 2 },
        { start: 3, end: 4, data: 3 },
        { start: 4, end: 5, data: 4 }
    ];

    it('should take first N spans', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>(3)(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2]
        ]);
    });

    it('should take last N spans', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>(-2)(input)
        );

        deepStrictEqual(startEndData(spans), [
            [3, 4, 3],
            [4, 5, 4]
        ]);
    });

    it('should take first span with keyword', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>('first')(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 1, 0]
        ]);
    });

    it('should take last span with keyword', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>('last')(input)
        );

        deepStrictEqual(startEndData(spans), [
            [4, 5, 4]
        ]);
    });

    it('should take all spans if N is larger than count', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>(10)(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2],
            [3, 4, 3],
            [4, 5, 4]
        ]);
    });

    it('should take zero spans if N is 0', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>(0)(input)
        );

        deepStrictEqual(spans, []);
    });

    it('should handle empty input', () => {
        const spans = generateSpans(
            'test',
            applyTake<undefined, unknown>(5)([])
        );

        deepStrictEqual(spans, []);
    });

    it('should preserve origins', () => {
        const origin = { start: 100, end: 200, data: 0 };
        const inputWithOrigin = [
            { start: 0, end: 1, data: 0, origin },
            { start: 1, end: 2, data: 1, origin },
            { start: 2, end: 3, data: 2, origin }
        ];

        const spans = generateSpans(
            'abc',
            applyTake<number, unknown>(2)(inputWithOrigin as any)
        );

        deepStrictEqual(spans[0].origin, origin);
        deepStrictEqual(spans[1].origin, origin);
    });

    it('should work with single span input', () => {
        const singleInput = [{ start: 0, end: 5, data: 'test' }];

        const spans = generateSpans(
            'hello',
            applyTake<string, unknown>('first')(singleInput)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'test']
        ]);
    });

    it('should handle negative N larger than span count', () => {
        const spans = generateSpans(
            'abcde',
            applyTake<number, unknown>(-10)(input)
        );

        // Should return all spans
        deepStrictEqual(startEndData(spans), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2],
            [3, 4, 3],
            [4, 5, 4]
        ]);
    });

    describe('with predicate', () => {
        it('should take first N matching spans', () => {
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    2,
                    (span: any) => span.data % 2 === 0  // Even numbers
                )(input)
            );

            deepStrictEqual(startEndData(spans), [
                [0, 1, 0],  // first even
                [2, 3, 2]   // second even
            ]);
        });

        it('should take last N matching spans', () => {
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    -2,
                    (span: any) => span.data % 2 === 0  // Even numbers
                )(input)
            );

            deepStrictEqual(startEndData(spans), [
                [2, 3, 2],  // 0, 2, 4 match - take last 2
                [4, 5, 4]
            ]);
        });

        it('should take first matching with keyword', () => {
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    'first',
                    (span: any) => span.data > 2
                )(input)
            );

            deepStrictEqual(startEndData(spans), [
                [3, 4, 3]  // First span with data > 2
            ]);
        });

        it('should take last matching with keyword', () => {
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    'last',
                    (span: any) => span.data < 3
                )(input)
            );

            deepStrictEqual(startEndData(spans), [
                [2, 3, 2]  // Last span with data < 3
            ]);
        });

        it('should stop early when limit reached (efficiency)', () => {
            let callCount = 0;
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    1,
                    () => {
                        callCount++;
                        return true;
                    }
                )(input)
            );

            deepStrictEqual(spans.length, 1);
            deepStrictEqual(callCount, 1);  // Should stop after first match
        });

        it('should return empty if no matches found', () => {
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    5,
                    () => false
                )(input)
            );

            deepStrictEqual(spans, []);
        });

        it('should work with context parameter', () => {
            const spans = generateSpans(
                'ab\ncd\nef',
                applyTake<number, unknown>(
                    2,
                    (span, { lines }) => lines.getLine(span.start) > 1
                )([
                    { start: 0, end: 1, data: 0 },  // line 1
                    { start: 3, end: 4, data: 1 },  // line 2
                    { start: 6, end: 7, data: 2 }   // line 3
                ])
            );

            deepStrictEqual(startEndData(spans), [
                [3, 4, 1],  // line 2 (first match)
                [6, 7, 2]   // line 3 (second match)
            ]);
        });

        it('should return fewer than N if not enough matches', () => {
            const spans = generateSpans(
                'abcde',
                applyTake<number, unknown>(
                    10,
                    (span: any) => span.data < 2
                )(input)
            );

            deepStrictEqual(startEndData(spans), [
                [0, 1, 0],
                [1, 2, 1]
            ]);
        });
    });
});

import { deepStrictEqual } from 'assert';
import { applyAugment, generateSpans, type SpanRecord } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyAugment', () => {
    it('should pass through original spans unchanged', () => {
        const input = [
            { start: 0, end: 5, data: 'hello' },
            { start: 6, end: 11, data: 'world' }
        ];

        const spans = generateSpans(
            'hello world',
            applyAugment<string, unknown>(() => {
                // No additional spans
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should preserve origin from original spans', () => {
        const origin = { start: 100, end: 200, data: 'root' };
        const input = [{ start: 0, end: 5, data: 'test', origin }];

        const spans = generateSpans(
            'test value',
            applyAugment<string, unknown>(() => {
                // No additional spans
            })(input)
        );

        deepStrictEqual(spans[0].origin, origin);
    });

    it('should add markers around spans', () => {
        const input = [{ start: 0, end: 5, data: 'word' }];

        const spans = generateSpans(
            'word test',
            applyAugment<string, unknown>((span, createSpan) => {
                createSpan(span.start, span.start, 'start');
                createSpan(span.end, span.end, 'end');
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'word'],  // Original
            [0, 0, 'start'], // Start marker
            [5, 5, 'end']    // End marker
        ]);
    });

    it('should set origin for additional spans', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const spans = generateSpans(
            'test value',
            applyAugment<string, unknown>((span, createSpan) => {
                createSpan(span.start, span.start, 'marker');
            })(input)
        );

        // Additional span should have origin pointing to input span
        const additionalSpan = spans.find(r => r.data === 'marker');
        const origin = additionalSpan!.origin as SpanRecord<string>;
        deepStrictEqual(origin.start, 0);
        deepStrictEqual(origin.end, 5);
        deepStrictEqual(origin.data, 'test');
    });

    it('should preserve origin chain for additional spans', () => {
        const rootOrigin = { start: 100, end: 200, data: 'root' };
        const input = [{ start: 0, end: 5, data: 'test', origin: rootOrigin }];

        const spans = generateSpans(
            'test value',
            applyAugment<string, unknown>((span, createSpan) => {
                createSpan(span.start, span.start, 'marker');
            })(input)
        );

        // Additional span should inherit the root origin
        const additionalSpan = spans.find(r => r.data === 'marker');
        deepStrictEqual(additionalSpan!.origin, rootOrigin);
    });

    it('should use index from context', () => {
        const input = [
            { start: 0, end: 1, data: 0 },
            { start: 1, end: 2, data: 1 },
            { start: 2, end: 3, data: 2 }
        ];

        const spans = generateSpans(
            'abc',
            applyAugment<number, unknown>((span, createSpan, { index }) => {
                createSpan(span.end, span.end, index * 10);
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 1, 0],   // Original
            [1, 1, 0],   // Additional (index 0)
            [1, 2, 1],   // Original
            [2, 2, 10],  // Additional (index 1)
            [2, 3, 2],   // Original
            [3, 3, 20]   // Additional (index 2)
        ]);
    });

    it('should access document from context', () => {
        const input = [{ start: 0, end: 5 }];

        const spans = generateSpans(
            'Hello world',
            applyAugment<undefined, unknown>((span, createSpan, { document }) => {
                const text = document.slice(span.start, span.end);
                createSpan(span.end, span.end, text.toUpperCase() as any);
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, undefined], // Original
            [5, 5, 'HELLO']    // Additional with transformed text
        ]);
    });

    it('should access lines from context', () => {
        const input = [{ start: 6, end: 11 }]; // 'world'

        const spans = generateSpans(
            'hello world\ntest line',
            applyAugment<undefined, unknown>((span, createSpan, { lines }) => {
                const lineStart = lines.getLineStart(span.start);
                createSpan(lineStart, lineStart, 'line-start' as any);
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [6, 11, undefined],    // Original
            [0, 0, 'line-start']   // Start of line containing span
        ]);
    });

    it('should handle empty input', () => {
        const spans = generateSpans(
            'test',
            applyAugment<undefined, unknown>((span, createSpan) => {
                createSpan(span.start, span.start, 'marker' as any);
            })([])
        );

        deepStrictEqual(spans, []);
    });

    it('should allow creating multiple additional spans per input', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const spans = generateSpans(
            'test value',
            applyAugment<string, unknown>((span, createSpan) => {
                createSpan(span.start, span.start, 'before');
                createSpan(span.end, span.end, 'after');
                createSpan(span.start, span.end, 'overlay');
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'test'],    // Original
            [0, 0, 'before'],  // Additional
            [5, 5, 'after'],   // Additional
            [0, 5, 'overlay']  // Additional
        ]);
    });

    it('should work with renderOptions', () => {
        const input = [{ start: 0, end: 5 }];

        const spans = generateSpans(
            'hello',
            applyAugment<undefined, { prefix: string }>((span, createSpan, { renderOptions }) => {
                const prefix = renderOptions?.prefix ?? '';
                if (prefix) {
                    createSpan(span.start, span.start, prefix as any);
                }
            })(input),
            { renderOptions: { prefix: '>>>' } }
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, undefined], // Original
            [0, 0, '>>>']      // Additional with prefix
        ]);
    });
});

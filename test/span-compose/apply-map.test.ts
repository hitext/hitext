import { deepStrictEqual } from 'assert';
import { applyMap, generateSpans, type SpanRecord } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyMap', () => {
    it('should map 1-to-1 (duplicate spans)', () => {
        const input = [
            { start: 0, end: 5, data: 'hello' },
            { start: 6, end: 11, data: 'world' }
        ];

        const spans = generateSpans(
            'hello world',
            applyMap<string, string, unknown>((span, createSpan) => {
                createSpan(span.start, span.end, span.data);
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should map 1-to-N (split spans)', () => {
        const input = [{ start: 0, end: 11, data: 'hello world' }];

        const spans = generateSpans(
            'hello world',
            applyMap<string, string, unknown>((span, createSpan, { document }) => {
                const text = document.slice(span.start, span.end);
                const words = text.split(' ');
                let offset = span.start;

                for (const word of words) {
                    createSpan(offset, offset + word.length, word);
                    offset += word.length + 1; // +1 for space
                }
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should map 1-to-0 (filter out spans)', () => {
        const input = [
            { start: 0, end: 5, data: 'keep' },
            { start: 6, end: 10, data: 'skip' },
            { start: 11, end: 15, data: 'keep' }
        ];

        const spans = generateSpans(
            'keep skip keep',
            applyMap<string, string, unknown>((span, createSpan) => {
                if (span.data === 'keep') {
                    createSpan(span.start, span.end, span.data);
                }
                // Don't call createSpan for 'skip' - effectively filters it out
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'keep'],
            [11, 15, 'keep']
        ]);
    });

    it('should expand spans using lines context', () => {
        const input = [{ start: 6, end: 11 }]; // 'world'

        const spans = generateSpans(
            'hello world\ntest line',
            applyMap<undefined, undefined, unknown>((span, createSpan, { lines }) => {
                const start = lines.getLineStart(span.start);
                const end = lines.getLineEnd(span.start);
                createSpan(start, end);
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 12, undefined] // Entire first line including newline
        ]);
    });

    it('should preserve origin automatically', () => {
        const input = [
            { start: 0, end: 5, data: 'test', origin: { start: 0, end: 10, data: 'root' } }
        ];

        const spans = generateSpans(
            'test value',
            applyMap<string, string, unknown>((span, createSpan) => {
                createSpan(span.start, span.end, 'mapped');
            })(input)
        );

        // Origin should be preserved (without checking type symbol)
        deepStrictEqual(spans[0].start, 0);
        deepStrictEqual(spans[0].end, 5);
        deepStrictEqual(spans[0].data, 'mapped');
        deepStrictEqual(spans[0].origin, { start: 0, end: 10, data: 'root' });
    });

    it('should create origin from span when no origin exists', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const spans = generateSpans(
            'test value',
            applyMap<string, string, unknown>((span, createSpan) => {
                createSpan(span.start, span.end, 'mapped');
            })(input)
        );

        // Origin should be created from input span (with type symbol from generateSpans)
        deepStrictEqual(spans[0].start, 0);
        deepStrictEqual(spans[0].end, 5);
        deepStrictEqual(spans[0].data, 'mapped');
        // Check origin properties individually (type is a Symbol so we skip it)
        const origin = spans[0].origin as SpanRecord<string>;
        deepStrictEqual(origin.start, 0);
        deepStrictEqual(origin.end, 5);
        deepStrictEqual(origin.data, 'test');
    });

    it('should use index from context', () => {
        const input = [
            { start: 0, end: 1, data: 0 },
            { start: 1, end: 2, data: 1 },
            { start: 2, end: 3, data: 2 }
        ];

        const spans = generateSpans(
            'abc',
            applyMap<number, number, unknown>((span, createSpan, { index }) => {
                createSpan(span.start, span.end, index);
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 1, 0],
            [1, 2, 1],
            [2, 3, 2]
        ]);
    });

    it('should handle empty input', () => {
        const spans = generateSpans(
            'test',
            applyMap<undefined, undefined, unknown>((span, createSpan) => {
                createSpan(span.start, span.end);
            })([])
        );

        deepStrictEqual(spans, []);
    });

    it('should allow creating multiple spans with different positions', () => {
        const input = [{ start: 0, end: 5 }]; // 'hello'

        const spans = generateSpans(
            'hello world',
            applyMap<undefined, string, unknown>((span, createSpan) => {
                createSpan(span.start, span.start + 1, 'first');
                createSpan(span.end - 1, span.end, 'last');
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 1, 'first'],
            [4, 5, 'last']
        ]);
    });

    it('should access document from context', () => {
        const input = [
            { start: 0, end: 5 },
            { start: 6, end: 11 }
        ];

        const spans = generateSpans(
            'Hello World',
            applyMap<undefined, string, unknown>((span, createSpan, { document }) => {
                const text = document.slice(span.start, span.end);
                createSpan(span.start, span.end, text.toUpperCase());
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'HELLO'],
            [6, 11, 'WORLD']
        ]);
    });

    it('should access renderOptions from context', () => {
        const input = [{ start: 0, end: 5 }];

        const spans = generateSpans(
            'hello',
            applyMap<undefined, number, { multiplier: number }>((span, createSpan, { renderOptions }) => {
                const multiplier = renderOptions?.multiplier ?? 1;
                createSpan(span.start, span.end, (span.end - span.start) * multiplier);
            })(input),
            { renderOptions: { multiplier: 3 } }
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 15] // (5 - 0) * 3
        ]);
    });

    it('should chain with other transformers', () => {
        const input = [
            { start: 0, end: 5, data: 'a' },
            { start: 6, end: 11, data: 'b' }
        ];

        const spans = generateSpans(
            'hello world',
            applyMap<string, string, unknown>((span, createSpan) => {
                // Duplicate each span
                createSpan(span.start, span.end, span.data);
                createSpan(span.start, span.end, span.data + '2');
            })(input)
        );

        deepStrictEqual(startEndData(spans), [
            [0, 5, 'a'],
            [0, 5, 'a2'],
            [6, 11, 'b'],
            [6, 11, 'b2']
        ]);
    });
});

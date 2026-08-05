import { strictEqual } from 'assert';
import { applyPadLines, generateSpans } from '../../src/index.js';

describe('applyPadLines()', () => {
    it('should create padding span for original line and lines after', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];
        const document = 'hello\nworld\ntest!\n';
        const spans = generateSpans(document, applyPadLines(1, 10)(input));

        strictEqual(spans.length, 2);
        strictEqual(spans[0].start, 0);
        strictEqual(spans[0].end, 5);
        strictEqual(spans[0].data, 5);
    });

    it('should create padding spans with lines before and after', () => {
        const input = [{ start: 6, end: 11, data: 'middle' }];
        const document = 'hello\nworld\ntest!\n';
        const spans = generateSpans(document, applyPadLines([1, 1], 10)(input));
        strictEqual(spans.length, 3);
    });

    it('should preserve original span as origin', () => {
        const input = [{ start: 0, end: 5, data: 'orig' }];
        const document = 'hello\nworld\n';
        const spans = generateSpans(document, applyPadLines(1, 10)(input));

        spans.forEach(span => {
            strictEqual(typeof span.origin, 'object');
            if (span.origin && !Array.isArray(span.origin)) {
                strictEqual(span.origin.start, 0);
                strictEqual(span.origin.end, 5);
                strictEqual(span.origin.data, 'orig');
            }
        });
    });
});

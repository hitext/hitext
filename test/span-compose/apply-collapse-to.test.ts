import { deepStrictEqual, strictEqual } from 'assert';
import { applyCollapseTo, generateSpans } from '../../src/index.js';
import { startEnd, startEndData, spanWithoutMarker } from '../utils.js';

describe('applyCollapseTo', () => {
    describe('Collapse positions', () => {
        it('should collapse to start', () => {
            const spans = generateSpans('hello world', applyCollapseTo('start')([[6, 11]]));

            deepStrictEqual(startEnd(spans), [[6, 6]]);
        });

        it('should collapse to end', () => {
            const spans = generateSpans('hello world', applyCollapseTo('end')([[0, 5]]));

            deepStrictEqual(startEnd(spans), [[5, 5]]);
        });

        it('should collapse to line-start', () => {
            const spans = generateSpans('line1\nline2\nline3', applyCollapseTo('line-start')([[9, 11]]));

            deepStrictEqual(startEnd(spans), [[6, 6]]);  // Start of line2
        });

        it('should collapse to line-end (after newline)', () => {
            const document = 'line1\nline2\nline3';
            const spans = generateSpans(document, applyCollapseTo('line-end')([[8, 10]]));

            deepStrictEqual(startEnd(spans), [[12, 12]]);
            strictEqual(document[12], 'l');  // Start of line3
        });

        it('should collapse to line-content-end (before newline)', () => {
            const document = 'line1\nline2\nline3';
            const spans = generateSpans(document, applyCollapseTo('line-content-end')([[8, 10]]));

            deepStrictEqual(startEnd(spans), [[11, 11]]);
            strictEqual(document[11], '\n');
        });

        it('should collapse to document-start', () => {
            const spans = generateSpans('line1\nline2\nline3', applyCollapseTo('document-start')([[6, 11], [12, 17]]));

            deepStrictEqual(startEnd(spans), [[0, 0], [0, 0]]);
        });

        it('should collapse to document-end', () => {
            const spans = generateSpans('line1\nline2\nline3', applyCollapseTo('document-end')([[0, 5], [6, 11]]));

            deepStrictEqual(startEnd(spans), [[17, 17], [17, 17]]);
        });
    });

    it('should collapse multiple spans', () => {
        const spans = generateSpans('one two three', applyCollapseTo('start')([[0, 3], [4, 7], [8, 13]]));

        deepStrictEqual(startEnd(spans), [[0, 0], [4, 4], [8, 8]]);
    });

    it('should preserve data when collapsing', () => {
        const spans = generateSpans('hello world', applyCollapseTo('start')([{ start: 6, end: 11, data: { type: 'word' } }]));

        deepStrictEqual(startEndData(spans), [[6, 6, { type: 'word' }]]);
    });

    it('should handle line without trailing newline', () => {
        const spans = generateSpans('line1\nline2\nline3', applyCollapseTo('line-content-end')([[14, 16]]));

        deepStrictEqual(startEnd(spans), [[17, 17]]);
    });

    it('should handle multiline span (uses start line for line-start)', () => {
        const spans = generateSpans('line1\nline2\nline3', applyCollapseTo('line-start')([[2, 10]]));

        deepStrictEqual(startEnd(spans), [[0, 0]]);  // Start of line1
    });

    it('should handle multiline span (uses end line for line-content-end)', () => {
        const spans = generateSpans('line1\nline2\nline3', applyCollapseTo('line-content-end')([[2, 10]]));

        deepStrictEqual(startEnd(spans), [[11, 11]]);  // End of line2 content
    });

    it('should work with \\r line endings', () => {
        const document = 'line1\rline2\rline3';
        const spans = generateSpans(document, applyCollapseTo('line-content-end')([[7, 9]]));

        deepStrictEqual(startEnd(spans), [[11, 11]]);
        strictEqual(document[11], '\r');
    });

    it('should work with \\r\\n line endings', () => {
        const document = 'line1\r\nline2\r\nline3';
        const spans = generateSpans(document, applyCollapseTo('line-content-end')([[8, 10]]));

        deepStrictEqual(startEnd(spans), [[12, 12]]);
        strictEqual(document.slice(12, 14), '\r\n');
    });

    it('should handle zero-width span', () => {
        const spans = generateSpans('hello world', applyCollapseTo('start')([[5, 5]]));

        deepStrictEqual(startEnd(spans), [[5, 5]]);
    });

    it('should handle empty document', () => {
        const spans = generateSpans('', applyCollapseTo('start')([[0, 0]]));

        deepStrictEqual(startEnd(spans), [[0, 0]]);
    });

    it('should create origin when input has no origin', () => {
        const spans = generateSpans('hello world', applyCollapseTo('start')([[6, 11]]));

        deepStrictEqual(spanWithoutMarker(spans), [
            [6, 6, undefined, { start: 6, end: 11, data: undefined }]
        ]);
    });

    it('should preserve origin when input has origin', () => {
        const spans = generateSpans(
            'hello world',
            applyCollapseTo('end')([{ start: 6, end: 11, data: 'test', origin: { start: 0, end: 5, data: 'original' } }])
        );

        deepStrictEqual(spanWithoutMarker(spans), [
            [11, 11, 'test', { start: 0, end: 5, data: 'original' }]
        ]);
    });
});

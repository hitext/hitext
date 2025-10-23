import { deepStrictEqual, strictEqual } from 'assert';
import { applyCollapseTo, generateRanges } from '../../src/index.js';
import { startEnd, startEndData, rangeWithoutMarker } from '../utils.js';

describe('applyCollapseTo', () => {
    describe('Collapse positions', () => {
        it('should collapse to start', () => {
            const ranges = generateRanges('hello world', applyCollapseTo('start')([[6, 11]]));

            deepStrictEqual(startEnd(ranges), [[6, 6]]);
        });

        it('should collapse to end', () => {
            const ranges = generateRanges('hello world', applyCollapseTo('end')([[0, 5]]));

            deepStrictEqual(startEnd(ranges), [[5, 5]]);
        });

        it('should collapse to line-start', () => {
            const ranges = generateRanges('line1\nline2\nline3', applyCollapseTo('line-start')([[9, 11]]));

            deepStrictEqual(startEnd(ranges), [[6, 6]]);  // Start of line2
        });

        it('should collapse to line-end (after newline)', () => {
            const document = 'line1\nline2\nline3';
            const ranges = generateRanges(document, applyCollapseTo('line-end')([[8, 10]]));

            deepStrictEqual(startEnd(ranges), [[12, 12]]);
            strictEqual(document[12], 'l');  // Start of line3
        });

        it('should collapse to line-content-end (before newline)', () => {
            const document = 'line1\nline2\nline3';
            const ranges = generateRanges(document, applyCollapseTo('line-content-end')([[8, 10]]));

            deepStrictEqual(startEnd(ranges), [[11, 11]]);
            strictEqual(document[11], '\n');
        });

        it('should collapse to document-start', () => {
            const ranges = generateRanges('line1\nline2\nline3', applyCollapseTo('document-start')([[6, 11], [12, 17]]));

            deepStrictEqual(startEnd(ranges), [[0, 0], [0, 0]]);
        });

        it('should collapse to document-end', () => {
            const ranges = generateRanges('line1\nline2\nline3', applyCollapseTo('document-end')([[0, 5], [6, 11]]));

            deepStrictEqual(startEnd(ranges), [[17, 17], [17, 17]]);
        });
    });

    it('should collapse multiple ranges', () => {
        const ranges = generateRanges('one two three', applyCollapseTo('start')([[0, 3], [4, 7], [8, 13]]));

        deepStrictEqual(startEnd(ranges), [[0, 0], [4, 4], [8, 8]]);
    });

    it('should preserve data when collapsing', () => {
        const ranges = generateRanges('hello world', applyCollapseTo('start')([{ start: 6, end: 11, data: { type: 'word' } }]));

        deepStrictEqual(startEndData(ranges), [[6, 6, { type: 'word' }]]);
    });

    it('should handle line without trailing newline', () => {
        const ranges = generateRanges('line1\nline2\nline3', applyCollapseTo('line-content-end')([[14, 16]]));

        deepStrictEqual(startEnd(ranges), [[17, 17]]);
    });

    it('should handle multiline range (uses start line for line-start)', () => {
        const ranges = generateRanges('line1\nline2\nline3', applyCollapseTo('line-start')([[2, 10]]));

        deepStrictEqual(startEnd(ranges), [[0, 0]]);  // Start of line1
    });

    it('should handle multiline range (uses end line for line-content-end)', () => {
        const ranges = generateRanges('line1\nline2\nline3', applyCollapseTo('line-content-end')([[2, 10]]));

        deepStrictEqual(startEnd(ranges), [[11, 11]]);  // End of line2 content
    });

    it('should work with \\r line endings', () => {
        const document = 'line1\rline2\rline3';
        const ranges = generateRanges(document, applyCollapseTo('line-content-end')([[7, 9]]));

        deepStrictEqual(startEnd(ranges), [[11, 11]]);
        strictEqual(document[11], '\r');
    });

    it('should work with \\r\\n line endings', () => {
        const document = 'line1\r\nline2\r\nline3';
        const ranges = generateRanges(document, applyCollapseTo('line-content-end')([[8, 10]]));

        deepStrictEqual(startEnd(ranges), [[12, 12]]);
        strictEqual(document.slice(12, 14), '\r\n');
    });

    it('should handle zero-width range', () => {
        const ranges = generateRanges('hello world', applyCollapseTo('start')([[5, 5]]));

        deepStrictEqual(startEnd(ranges), [[5, 5]]);
    });

    it('should handle empty document', () => {
        const ranges = generateRanges('', applyCollapseTo('start')([[0, 0]]));

        deepStrictEqual(startEnd(ranges), [[0, 0]]);
    });

    it('should create origin when input has no origin', () => {
        const ranges = generateRanges('hello world', applyCollapseTo('start')([[6, 11]]));

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [6, 6, undefined, { start: 6, end: 11, data: undefined }]
        ]);
    });

    it('should preserve origin when input has origin', () => {
        const ranges = generateRanges(
            'hello world',
            applyCollapseTo('end')([{ start: 6, end: 11, data: 'test', origin: { start: 0, end: 5, data: 'original' } }])
        );

        deepStrictEqual(rangeWithoutMarker(ranges), [
            [11, 11, 'test', { start: 0, end: 5, data: 'original' }]
        ]);
    });
});

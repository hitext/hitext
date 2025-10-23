import { deepStrictEqual } from 'assert';
import { applyExpandTo, generateRanges } from '../../src/index.js';
import { renderRanges, startEnd, startEndData, rangeWithoutMarker } from '../utils.js';

describe('applyExpandTo', () => {
    describe('Expand positions', () => {
        it('should expand to line (including newlines)', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line')([[7, 9]]));
            deepStrictEqual(expanded, ['line2\n']);
        });

        it('should expand to line-content (excluding newlines)', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line-content')([[7, 9]]));
            deepStrictEqual(expanded, ['line2']);
        });

        it('should expand to line-start', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line-start')([[7, 9]]));
            deepStrictEqual(expanded, ['lin']);  // Start expands to line beginning, end stays at 9
        });

        it('should expand to line-end', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line-end')([[7, 9]]));
            deepStrictEqual(expanded, ['ine2\n']);  // Start stays at 7, end expands to after newline
        });

        it('should expand to line-content-end', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line-content-end')([[7, 9]]));
            deepStrictEqual(expanded, ['ine2']);  // Start stays at 7, end expands before newline
        });

        it('should expand to document', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('document')([[7, 9]]));
            deepStrictEqual(expanded, ['line1\nline2\nline3']);
        });

        it('should expand to document-start', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('document-start')([[7, 9]]));
            deepStrictEqual(expanded, ['line1\nlin']);  // Start to 0, end stays at 9
        });

        it('should expand to document-end', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('document-end')([[7, 9]]));
            deepStrictEqual(expanded, ['ine2\nline3']);  // Start stays at 7, end to document end
        });
    });

    describe('Context lines', () => {
        it('should expand line with symmetric context', () => {
            const expanded = renderRanges('line1\nline2\nline3\nline4\nline5', applyExpandTo('line', 1)([[13, 15]]));
            deepStrictEqual(expanded, ['line2\nline3\nline4\n']);  // line3 ±1 line
        });

        it('should expand line with asymmetric context', () => {
            const expanded = renderRanges('line1\nline2\nline3\nline4\nline5', applyExpandTo('line', [1, 2])([[13, 15]]));
            deepStrictEqual(expanded, ['line2\nline3\nline4\nline5']);  // line3, 1 before, 2 after
        });

        it('should expand line-content with context', () => {
            const expanded = renderRanges('line1\nline2\nline3\nline4\nline5', applyExpandTo('line-content', 1)([[13, 15]]));
            deepStrictEqual(expanded, ['line2\nline3\nline4']);  // Without trailing newline
        });

        it('should expand line-start with context', () => {
            const expanded = renderRanges('line1\nline2\nline3\nline4', applyExpandTo('line-start', 1)([[13, 15]]));
            deepStrictEqual(expanded, ['line2\nlin']);  // Start to line2, end at 15
        });

        it('should expand line-end with context', () => {
            const expanded = renderRanges('line1\nline2\nline3\nline4', applyExpandTo('line-end', [0, 1])([[7, 9]]));
            deepStrictEqual(expanded, ['ine2\nline3\n']);  // Start at 7, end through line3
        });
    });

    describe('Line endings', () => {
        it('should handle last line without trailing newline', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line')([[13, 15]]));
            deepStrictEqual(expanded, ['line3']);
        });

        it('should handle CRLF line endings', () => {
            const expanded = renderRanges('line1\r\nline2\r\nline3', applyExpandTo('line-content')([[9, 11]]));
            deepStrictEqual(expanded, ['line2']);
        });
    });

    describe('Data and origin', () => {
        it('should preserve data when expanding', () => {
            const ranges = generateRanges('line1\nline2\nline3', applyExpandTo('line')([{ start: 7, end: 9, data: { type: 'match' } }]));
            deepStrictEqual(startEndData(ranges), [[6, 12, { type: 'match' }]]);
        });

        it('should create origin when input has no origin', () => {
            const ranges = generateRanges('line1\nline2\nline3', applyExpandTo('line')([[7, 9]]));
            deepStrictEqual(rangeWithoutMarker(ranges), [
                [6, 12, undefined, { start: 7, end: 9, data: undefined }]
            ]);
        });

        it('should preserve origin when input has origin', () => {
            const input = [{ start: 7, end: 9, data: 'test', origin: { start: 0, end: 5, data: 'original' } }];
            const ranges = generateRanges('line1\nline2\nline3', applyExpandTo('line-content')(input));
            deepStrictEqual(rangeWithoutMarker(ranges), [
                [6, 11, 'test', { start: 0, end: 5, data: 'original' }]
            ]);
        });
    });

    describe('Edge cases', () => {
        it('should handle zero-width range', () => {
            const expanded = renderRanges('line1\nline2\nline3', applyExpandTo('line')([[7, 7]]));
            deepStrictEqual(expanded, ['line2\n']);
        });

        it('should handle multiline range', () => {
            const expanded = renderRanges('line1\nline2\nline3\nline4', applyExpandTo('line')([[7, 15]]));
            deepStrictEqual(expanded, ['line2\nline3\n']);
        });

        it('should handle range at document boundaries', () => {
            const start = renderRanges('line1\nline2\nline3', applyExpandTo('line')([[0, 2]]));
            const end = renderRanges('line1\nline2\nline3', applyExpandTo('line')([[15, 17]]));
            deepStrictEqual(start, ['line1\n']);
            deepStrictEqual(end, ['line3']);
        });

        it('should handle empty document', () => {
            const expanded = renderRanges('', applyExpandTo('line')([[0, 0]]));
            deepStrictEqual(expanded, ['']);
        });

        it('should handle multiple ranges', () => {
            const ranges = generateRanges('one\ntwo\nthree', applyExpandTo('document-start')([[0, 3], [8, 13]]));
            deepStrictEqual(startEnd(ranges), [[0, 3], [0, 13]]);
        });
    });
});

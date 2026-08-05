import { deepStrictEqual } from 'assert';
import { applyFitToWindow, generateSpans } from '../../src/index.js';
import { renderSpans, spanWithoutMarker } from '../utils.js';

describe('applyFitToWindow', () => {
    it('should expand small span to fit window size', () => {
        const input = [{ start: 27, end: 32 }]; // "ERROR"
        const windows = renderSpans('Lorem ipsum dolor sit amet ERROR consectetur adipiscing elit', applyFitToWindow(35)(input));

        deepStrictEqual(windows, ['dolor sit amet ERROR consectetur ad']);
    });

    it('should expand symmetrically when space available', () => {
        const input = [{ start: 30, end: 35 }]; // "ERROR"
        const windows = renderSpans('a'.repeat(30) + 'ERROR' + 'b'.repeat(30), applyFitToWindow(25)(input));

        deepStrictEqual(windows, ['a'.repeat(10) + 'ERROR' + 'b'.repeat(10)]);
    });

    it('should use default window size (80) when not specified', () => {
        const input = [{ start: 40, end: 45 }]; // "ERROR"
        const windows = renderSpans('a'.repeat(40) + 'ERROR' + 'b'.repeat(60), applyFitToWindow()(input));

        deepStrictEqual(windows, ['a'.repeat(37) + 'ERROR' + 'b'.repeat(38)]);
    });

    it('should show entire text when smaller than window', () => {
        const input = [{ start: 6, end: 11 }]; // "ERROR"
        const windows = renderSpans('Short ERROR', applyFitToWindow(50)(input));

        deepStrictEqual(windows, ['Short ERROR']);
    });

    it('should expand right when limited on left (near start)', () => {
        const input = [{ start: 0, end: 5 }]; // "ERROR"
        const windows = renderSpans('ERROR at the very start of this long line', applyFitToWindow(25)(input));

        deepStrictEqual(windows, ['ERROR at the very start o']);
    });

    it('should expand left when limited on right (near end)', () => {
        const input = [{ start: 36, end: 41 }]; // "ERROR"
        const windows = renderSpans('This is a long line that ends with ERROR', applyFitToWindow(25)(input));

        deepStrictEqual(windows, ['line that ends with ERROR']);
    });

    it('should use excess from constrained side on other side', () => {
        const input = [{ start: 2, end: 7 }]; // "ERROR"
        const windows = renderSpans('ab' + 'ERROR' + 'c'.repeat(50), applyFitToWindow(20)(input));

        deepStrictEqual(windows, ['abERROR' + 'c'.repeat(13)]);
    });

    it('should trim spans longer than window size (default behavior)', () => {
        const input = [{ start: 0, end: 55 }]; // 50 a's + "ERROR"
        const windows = renderSpans('a'.repeat(50) + 'ERROR' + 'b'.repeat(50), applyFitToWindow(30)(input));

        deepStrictEqual(windows, ['a'.repeat(30)]);
    });

    it('should preserve long spans when allowTrimming is false', () => {
        const input = [{ start: 0, end: 55 }]; // 50 a's + "ERROR"
        const windows = renderSpans('a'.repeat(50) + 'ERROR' + 'b'.repeat(50), applyFitToWindow(30, false)(input));

        deepStrictEqual(windows, ['a'.repeat(50) + 'ERROR']);
    });

    it('should handle multiple matches in same line', () => {
        const input = [
            { start: 5, end: 11 }, // "ERROR1"
            { start: 16, end: 22 }  // "ERROR2"
        ];
        const windows = renderSpans('Find ERROR1 and ERROR2 in this line', applyFitToWindow(16)(input));

        deepStrictEqual(windows, [
            'Find ERROR1 and ',
            ' and ERROR2 in t'
        ]);
    });

    it('should handle match at document boundaries', () => {
        const start = renderSpans('ERROR at the start', applyFitToWindow(25)([{ start: 0, end: 5 }]));
        const end = renderSpans('Ends with ERROR', applyFitToWindow(25)([{ start: 10, end: 15 }]));

        deepStrictEqual(start, ['ERROR at the start']);
        deepStrictEqual(end, ['Ends with ERROR']);
    });

    it('should handle empty input', () => {
        const windows = renderSpans('No matches here', applyFitToWindow(25)([]));
        deepStrictEqual(windows, []);
    });

    it('should trim multiline spans to first line', () => {
        const input = [{ start: 12, end: 40 }]; // "ERROR1\nLine 2 continues"
        const windows = renderSpans(
            'Line 1 with ERROR1\nLine 2 continues here\nLine 3',
            applyFitToWindow(80)(input)
        );

        deepStrictEqual(windows, ['Line 1 with ERROR1']);
    });

    it('should trim multiline spans to the first line when trimming is disabled', () => {
        const spans = generateSpans(
            'abcdefghij\nsecond',
            applyFitToWindow(5, false)([{ start: 0, end: 17, data: 'test' }])
        );

        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 10, 'test', { start: 0, end: 17, data: 'test' }]
        ]);
    });

    it('should handle line with leading whitespace', () => {
        const input = [{ start: 8, end: 13 }]; // "ERROR"
        const windows = renderSpans(
            '        ERROR in indented line',
            applyFitToWindow(26)(input)
        );

        deepStrictEqual(windows, ['        ERROR in indented ']);
    });

    it('should create origin when input has no origin', () => {
        const input = [{ start: 27, end: 32 }];
        const spans = generateSpans(
            'Lorem ipsum dolor sit amet ERROR consectetur',
            applyFitToWindow(35)(input)
        );

        deepStrictEqual(spanWithoutMarker(spans), [
            [9, 44, undefined, { start: 27, end: 32, data: undefined }]
        ]);
    });

    it('should preserve origin when input has origin', () => {
        const input = [{ start: 27, end: 32, data: 'test', origin: { start: 100, end: 105, data: 'original' } }];
        const spans = generateSpans(
            'Lorem ipsum dolor sit amet ERROR consectetur',
            applyFitToWindow(35)(input)
        );

        deepStrictEqual(spanWithoutMarker(spans), [
            [9, 44, 'test', { start: 100, end: 105, data: 'original' }]
        ]);
    });

    it('should preserve root origin when span is trimmed', () => {
        const input = [
            { start: 20, end: 30, data: 'test1' },
            { start: 10, end: 30, data: 'test2' }
        ];
        const spans = generateSpans(
            'Lorem ipsum dolor sit amet ERROR consectetur',
            applyFitToWindow(16)(input)
        );

        deepStrictEqual(spanWithoutMarker(spans), [
            [17, 33, 'test1', { start: 20, end: 30, data: 'test1' }],
            [10, 26, 'test2', { start: 10, end: 30, data: 'test2' }]
        ]);
    });
});

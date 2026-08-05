import { deepStrictEqual } from 'assert';
import { generateSpans, spansFromMatch } from '../../src/index.js';
import type { GeneratedSpan } from '../../src/types.js';
import { startEndData, regexpMatch } from '../utils.js';

// Overloaded gen function for type inference
function gen(document: string, pattern: RegExp): Array<GeneratedSpan<RegExpExecArray>>;
function gen(document: string, pattern: string): Array<GeneratedSpan<string>>;
function gen(document: string, pattern: RegExp | string): Array<GeneratedSpan<any>> {
    return generateSpans(document, spansFromMatch(pattern as any));
}

describe('spansFromMatch', () => {
    describe('String patterns', () => {
        it('should find single match', () => {
            const spans = gen('Hello world!', 'world');
            deepStrictEqual(startEndData(spans), [
                [6, 11, 'world']
            ]);
        });

        it('should find multiple matches', () => {
            const spans = gen('Hello world! Hello world!', 'world');
            deepStrictEqual(startEndData(spans), [
                [6, 11, 'world'],
                [19, 24, 'world']
            ]);
        });

        it('should find overlapping matches', () => {
            const spans = gen('aaaa', 'aa');
            deepStrictEqual(startEndData(spans), [
                [0, 2, 'aa'],
                [1, 3, 'aa'],
                [2, 4, 'aa']
            ]);
        });

        it('should handle no matches', () => {
            const spans = gen('Hello world!', 'xyz');
            deepStrictEqual(spans, []);
        });

        it('should handle empty input', () => {
            const spans = gen('', 'test');
            deepStrictEqual(spans, []);
        });

        it('should match an empty string at every document offset', () => {
            const spans = gen('ab', '');
            deepStrictEqual(startEndData(spans), [
                [0, 0, ''],
                [1, 1, ''],
                [2, 2, '']
            ]);
        });

        it('should handle special regex characters as literal', () => {
            const spans = gen('2 + 2 = 4', '+');
            deepStrictEqual(startEndData(spans), [
                [2, 3, '+']
            ]);
        });

        it('should convert non-string values to string', () => {
            const spans = gen('1234567890', 234 as any);
            deepStrictEqual(startEndData(spans), [
                [1, 4, '234']
            ]);
        });
    });

    describe('RegExp patterns', () => {
        it('should find matches with simple regex', () => {
            const input = 'Hello world!';
            const spans = gen(input, /\w+/g);
            deepStrictEqual(startEndData(spans), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('should handle case-insensitive flag', () => {
            const input = 'Hello world!';
            const spans = gen(input, /hello|world/ig);
            deepStrictEqual(startEndData(spans), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('should find only first match without global flag', () => {
            const input = 'Hello world Hello';
            const spans = gen(input, /Hello/);
            deepStrictEqual(spans.length, 1); // Finds only first match without 'g' flag
            deepStrictEqual(startEndData(spans), [
                [0, 5, regexpMatch(input, ['Hello'], 0)]
            ]);
        });

        it('should find all matches with global flag', () => {
            const input = 'Hello world Hello';
            const spans = gen(input, /Hello/g);
            deepStrictEqual(spans.length, 2); // Finds all with 'g' flag
            deepStrictEqual(startEndData(spans), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [12, 17, regexpMatch(input, ['Hello'], 12)]
            ]);
        });

        it('should handle multiline flag', () => {
            const input = 'start\nmiddle\nend';
            const spans = gen(input, /^middle$/gm);
            deepStrictEqual(startEndData(spans), [
                [6, 12, regexpMatch(input, ['middle'], 6)]
            ]);
        });

        it('should handle no matches', () => {
            const spans = gen('Hello world!', /\d+/);
            deepStrictEqual(spans, []);
        });

        it('should advance after zero-width global matches', () => {
            const spans = gen('first\nsecond', /^/gm);
            deepStrictEqual(spans.map(({ start, end }) => [start, end]), [
                [0, 0],
                [6, 6]
            ]);
        });

        it('should advance by code point for zero-width Unicode matches', () => {
            const spans = gen('\u{1F600}', /(?=)/gu);
            deepStrictEqual(spans.map(({ start, end }) => [start, end]), [
                [0, 0],
                [2, 2]
            ]);
        });

        it('should isolate RegExp state between generator runs', () => {
            const pattern = /Hello/y;
            pattern.lastIndex = 6;
            const source = spansFromMatch(pattern);

            const first = generateSpans('Hello world', source);
            const second = generateSpans('Hello again', source);

            deepStrictEqual(first.map(({ start, end }) => [start, end]), [[0, 5]]);
            deepStrictEqual(second.map(({ start, end }) => [start, end]), [[0, 5]]);
            deepStrictEqual(pattern.lastIndex, 6);
        });
    });

    describe('Capture groups', () => {
        it('should include capture groups in data', () => {
            const input = 'test@example.com and user@domain.org';
            const spans = gen(input, /(\w+)@(\w+\.\w+)/g);

            deepStrictEqual(startEndData(spans), [
                [0, 16, regexpMatch(input, ['test@example.com', 'test', 'example.com'], 0)],
                [21, 36, regexpMatch(input, ['user@domain.org', 'user', 'domain.org'], 21)]
            ]);
        });

        it('should handle optional capture groups', () => {
            const input = 'hello world';
            const spans = gen(input, /(\w+)(\s+)?/g);

            deepStrictEqual(startEndData(spans), [
                [0, 6, regexpMatch(input, ['hello ', 'hello', ' '], 0)],
                [6, 11, regexpMatch(input, ['world', 'world', undefined as any], 6)]
            ]);
        });
    });

    describe('Multi-line text', () => {
        it('should find matches across lines', () => {
            const input = 'line1\nline2\nline3';
            const spans = gen(input, 'line');

            deepStrictEqual(startEndData(spans), [
                [0, 4, 'line'],
                [6, 10, 'line'],
                [12, 16, 'line']
            ]);
        });

        it('should match newline characters', () => {
            const input = 'a\nb\nc';
            const spans = gen(input, /\n/g);

            deepStrictEqual(startEndData(spans), [
                [1, 2, regexpMatch(input, ['\n'], 1)],
                [3, 4, regexpMatch(input, ['\n'], 3)]
            ]);
        });
    });
});

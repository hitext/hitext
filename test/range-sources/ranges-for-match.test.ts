import { deepStrictEqual } from 'assert';
import { generateRanges, rangesForMatch } from '../../src/index.js';
import type { GeneratedRange } from '../../src/types.js';
import { startEndData, regexpMatch } from '../utils.js';

// Overloaded gen function for type inference
function gen(document: string, pattern: RegExp): Array<GeneratedRange<RegExpExecArray>>;
function gen(document: string, pattern: string): Array<GeneratedRange<string>>;
function gen(document: string, pattern: RegExp | string): Array<GeneratedRange<any>> {
    return generateRanges(document, rangesForMatch(pattern as any));
}

describe('rangesForMatch', () => {
    describe('String patterns', () => {
        it('should find single match', () => {
            const ranges = gen('Hello world!', 'world');
            deepStrictEqual(startEndData(ranges), [
                [6, 11, 'world']
            ]);
        });

        it('should find multiple matches', () => {
            const ranges = gen('Hello world! Hello world!', 'world');
            deepStrictEqual(startEndData(ranges), [
                [6, 11, 'world'],
                [19, 24, 'world']
            ]);
        });

        it('should find overlapping matches', () => {
            const ranges = gen('aaaa', 'aa');
            deepStrictEqual(startEndData(ranges), [
                [0, 2, 'aa'],
                [1, 3, 'aa'],
                [2, 4, 'aa']
            ]);
        });

        it('should handle no matches', () => {
            const ranges = gen('Hello world!', 'xyz');
            deepStrictEqual(ranges, []);
        });

        it('should handle empty input', () => {
            const ranges = gen('', 'test');
            deepStrictEqual(ranges, []);
        });

        it('should handle special regex characters as literal', () => {
            const ranges = gen('2 + 2 = 4', '+');
            deepStrictEqual(startEndData(ranges), [
                [2, 3, '+']
            ]);
        });

        it('should convert non-string values to string', () => {
            const ranges = gen('1234567890', 234 as any);
            deepStrictEqual(startEndData(ranges), [
                [1, 4, '234']
            ]);
        });
    });

    describe('RegExp patterns', () => {
        it('should find matches with simple regex', () => {
            const input = 'Hello world!';
            const ranges = gen(input, /\w+/g);
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('should handle case-insensitive flag', () => {
            const input = 'Hello world!';
            const ranges = gen(input, /hello|world/ig);
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('should find only first match without global flag', () => {
            const input = 'Hello world Hello';
            const ranges = gen(input, /Hello/);
            deepStrictEqual(ranges.length, 1); // Finds only first match without 'g' flag
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)]
            ]);
        });

        it('should find all matches with global flag', () => {
            const input = 'Hello world Hello';
            const ranges = gen(input, /Hello/g);
            deepStrictEqual(ranges.length, 2); // Finds all with 'g' flag
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [12, 17, regexpMatch(input, ['Hello'], 12)]
            ]);
        });

        it('should handle multiline flag', () => {
            const input = 'start\nmiddle\nend';
            const ranges = gen(input, /^middle$/gm);
            deepStrictEqual(startEndData(ranges), [
                [6, 12, regexpMatch(input, ['middle'], 6)]
            ]);
        });

        it('should handle no matches', () => {
            const ranges = gen('Hello world!', /\d+/);
            deepStrictEqual(ranges, []);
        });
    });

    describe('Capture groups', () => {
        it('should include capture groups in data', () => {
            const input = 'test@example.com and user@domain.org';
            const ranges = gen(input, /(\w+)@(\w+\.\w+)/g);

            deepStrictEqual(startEndData(ranges), [
                [0, 16, regexpMatch(input, ['test@example.com', 'test', 'example.com'], 0)],
                [21, 36, regexpMatch(input, ['user@domain.org', 'user', 'domain.org'], 21)]
            ]);
        });

        it('should handle optional capture groups', () => {
            const input = 'hello world';
            const ranges = gen(input, /(\w+)(\s+)?/g);

            deepStrictEqual(startEndData(ranges), [
                [0, 6, regexpMatch(input, ['hello ', 'hello', ' '], 0)],
                [6, 11, regexpMatch(input, ['world', 'world', undefined as any], 6)]
            ]);
        });
    });

    describe('Multi-line text', () => {
        it('should find matches across lines', () => {
            const input = 'line1\nline2\nline3';
            const ranges = gen(input, 'line');

            deepStrictEqual(startEndData(ranges), [
                [0, 4, 'line'],
                [6, 10, 'line'],
                [12, 16, 'line']
            ]);
        });

        it('should match newline characters', () => {
            const input = 'a\nb\nc';
            const ranges = gen(input, /\n/g);

            deepStrictEqual(startEndData(ranges), [
                [1, 2, regexpMatch(input, ['\n'], 1)],
                [3, 4, regexpMatch(input, ['\n'], 3)]
            ]);
        });
    });
});

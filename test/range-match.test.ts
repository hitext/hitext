import { deepStrictEqual } from 'assert';
import { rangeMatch, generateRanges } from '../src/index.js';
import type { GeneratedRange } from '../src/types.js';
import { startEndData, regexpMatch } from './utils.js';

// Overloaded gen function for type inference
function gen(source: string, pattern: RegExp): Array<GeneratedRange<RegExpExecArray>>;
function gen(source: string, pattern: string): Array<GeneratedRange<string>>;
function gen(source: string, pattern: RegExp | string): Array<GeneratedRange<any>> {
    return generateRanges(source, rangeMatch(pattern as any));
}

describe('rangeMatch', () => {
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

        it('should handle no matches', () => {
            const ranges = gen('Hello world!', 'xyz');
            deepStrictEqual(ranges, []);
        });

        it('should convert non-string values to string', () => {
            const input = '1234567890';
            const ranges = gen(input, 234 as any);
            deepStrictEqual(startEndData(ranges), [
                [1, 4, '234']
            ]);
        });
    });

    describe('RegExp patterns', () => {
        it('should find matches with simple regex', () => {
            const input = 'Hello world!';
            const ranges = gen(input, /\w+/);
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('should handle case-insensitive regex', () => {
            const input = 'Hello world!';
            const ranges = gen(input, /hello|world/ig);
            deepStrictEqual(startEndData(ranges), [
                [0, 5, regexpMatch(input, ['Hello'], 0)],
                [6, 11, regexpMatch(input, ['world'], 6)]
            ]);
        });

        it('should add global flag if missing', () => {
            const input = 'Hello world Hello';
            const ranges = gen(input, /Hello/); // No 'g' flag
            // Should still find all matches because rangeMatch adds 'g'
            deepStrictEqual(ranges.length, 2);
        });

        it('should handle regex with no matches', () => {
            const ranges = gen('Hello world!', /\d+/);
            deepStrictEqual(ranges, []);
        });

        it('should preserve regex flags', () => {
            const input = 'ABC abc';
            const ranges = gen(input, /abc/gi);
            deepStrictEqual(ranges.length, 2);
        });
    });

    describe('Capture groups', () => {
        it('should work with regex capture groups', () => {
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

    describe('Edge cases', () => {
        it('should find all occurrences including overlapping positions (string)', () => {
            const ranges = gen('aaaa', 'aa');
            // indexOf finds at positions 0, 1, 2 (overlapping matches)
            deepStrictEqual(startEndData(ranges), [
                [0, 2, 'aa'],
                [1, 3, 'aa'],
                [2, 4, 'aa']
            ]);
        });

        it('should handle match at start of string', () => {
            const ranges = gen('test string', 'test');
            deepStrictEqual(startEndData(ranges), [
                [0, 4, 'test']
            ]);
        });

        it('should handle match at end of string', () => {
            const ranges = gen('string test', 'test');
            deepStrictEqual(startEndData(ranges), [
                [7, 11, 'test']
            ]);
        });

        it('should handle pattern same as entire string', () => {
            const ranges = gen('test', 'test');
            deepStrictEqual(startEndData(ranges), [
                [0, 4, 'test']
            ]);
        });

        it('should handle empty input string', () => {
            const ranges = gen('', 'test');
            deepStrictEqual(ranges, []);
        });

        it('should handle special regex characters in string pattern', () => {
            const ranges = gen('2 + 2 = 4', '+');
            deepStrictEqual(startEndData(ranges), [
                [2, 3, '+']
            ]);
        });
    });

    describe('Multi-line scenarios', () => {
        it('should find matches across lines', () => {
            const input = 'line1\n' +
                'line2\n' +
                'line3';
            const ranges = gen(input, 'line');

            deepStrictEqual(startEndData(ranges), [
                [0, 4, 'line'],
                [6, 10, 'line'],
                [12, 16, 'line']
            ]);
        });

        it('should work with multiline regex flag', () => {
            const input = 'start\n' +
                'middle\n' +
                'end';
            const ranges = gen(input, /^middle$/gm);

            deepStrictEqual(startEndData(ranges), [
                [6, 12, regexpMatch(input, ['middle'], 6)]
            ]);
        });

        it('should match newlines with regex', () => {
            const input = 'a\nb\nc';
            const ranges = gen(input, /\n/g);

            deepStrictEqual(startEndData(ranges), [
                [1, 2, regexpMatch(input, ['\n'], 1)],
                [3, 4, regexpMatch(input, ['\n'], 3)]
            ]);
        });
    });
});

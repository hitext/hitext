import { deepEqual } from 'assert';
import hitext from '../src/index.js';
import generateRanges from '../src/generateRanges.js';
import type { GenerateRanges, Range } from '../src/types.d.js';

const testMarker = Symbol('test');

function gen(source: string, generate: GenerateRanges): Range[] {
    return generateRanges(source, [{
        marker: testMarker,
        generate
    }]);
}

describe('build-in generators', () => {
    describe('match', () => {
        it('using string', () =>
            deepEqual(
                gen(
                    'Hello world! Hello world!',
                    hitext.gen.matches('world')
                ),
                [
                    { type: testMarker, start: 6, end: 11, data: undefined },
                    { type: testMarker, start: 19, end: 24, data: undefined }
                ]
            )
        );

        it('using regexp', () =>
            deepEqual(
                gen(
                    'Hello world!',
                    hitext.gen.matches(/\w+/)
                ),
                [
                    { type: testMarker, start: 0, end: 5, data: undefined },
                    { type: testMarker, start: 6, end: 11, data: undefined }
                ]
            )
        );

        it('using regexp with flags', () =>
            deepEqual(
                gen(
                    'Hello world!',
                    hitext.gen.matches(/hello|world/ig)
                ),
                [
                    { type: testMarker, start: 0, end: 5, data: undefined },
                    { type: testMarker, start: 6, end: 11, data: undefined }
                ]
            )
        );

        it('using non-string and non-regexp value', () =>
            deepEqual(
                gen(
                    '1234567890',
                    hitext.gen.matches('234')
                ),
                [
                    { type: testMarker, start: 1, end: 4, data: undefined }
                ]
            )
        );
    });

    describe('line', () => {
        it('new-line ending input', () =>
            deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\r',
                    hitext.gen.lines
                ),
                [
                    { type: testMarker, start: 0, end: 1, data: 1 },
                    { type: testMarker, start: 1, end: 3, data: 2 },
                    { type: testMarker, start: 3, end: 7, data: 3 },
                    { type: testMarker, start: 7, end: 11, data: 4 },
                    { type: testMarker, start: 11, end: 12, data: 5 },
                    { type: testMarker, start: 12, end: 12, data: 6 }
                ]
            )
        );

        it('non-new-line ending input', () =>
            deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\rdddd',
                    hitext.gen.lines
                ),
                [
                    { type: testMarker, start: 0, end: 1, data: 1 },
                    { type: testMarker, start: 1, end: 3, data: 2 },
                    { type: testMarker, start: 3, end: 7, data: 3 },
                    { type: testMarker, start: 7, end: 11, data: 4 },
                    { type: testMarker, start: 11, end: 12, data: 5 },
                    { type: testMarker, start: 12, end: 16, data: 6 }
                ]
            )
        );
    });

    describe('lineContent', () => {
        it('new-line ending input', () =>
            deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\r',
                    hitext.gen.lineContents
                ),
                [
                    { type: testMarker, start: 0, end: 0, data: 1 },
                    { type: testMarker, start: 1, end: 2, data: 2 },
                    { type: testMarker, start: 3, end: 5, data: 3 },
                    { type: testMarker, start: 7, end: 10, data: 4 },
                    { type: testMarker, start: 11, end: 11, data: 5 },
                    { type: testMarker, start: 12, end: 12, data: 6 }
                ]
            )
        );

        it('non-new-line ending input', () =>
            deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\rdddd',
                    hitext.gen.lineContents
                ),
                [
                    { type: testMarker, start: 0, end: 0, data: 1 },
                    { type: testMarker, start: 1, end: 2, data: 2 },
                    { type: testMarker, start: 3, end: 5, data: 3 },
                    { type: testMarker, start: 7, end: 10, data: 4 },
                    { type: testMarker, start: 11, end: 11, data: 5 },
                    { type: testMarker, start: 12, end: 16, data: 6 }
                ]
            )
        );
    });

    describe('newLine', () => {
        it('new-line ending input', () =>
            deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\r',
                    hitext.gen.newlines
                ),
                [
                    { type: testMarker, start: 0, end: 1, data: 1 },
                    { type: testMarker, start: 2, end: 3, data: 2 },
                    { type: testMarker, start: 5, end: 7, data: 3 },
                    { type: testMarker, start: 10, end: 11, data: 4 },
                    { type: testMarker, start: 11, end: 12, data: 5 }
                ]
            )
        );

        it('non-new-line ending input', () =>
            deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\rdddd',
                    hitext.gen.newlines
                ),
                [
                    { type: testMarker, start: 0, end: 1, data: 1 },
                    { type: testMarker, start: 2, end: 3, data: 2 },
                    { type: testMarker, start: 5, end: 7, data: 3 },
                    { type: testMarker, start: 10, end: 11, data: 4 },
                    { type: testMarker, start: 11, end: 12, data: 5 }
                ]
            )
        );
    });
});

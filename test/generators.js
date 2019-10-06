const assert = require('assert');
const hitext = require('../src');
const generateRanges = require('../src/generateRanges');

function gen(source, generate) {
    return generateRanges(source, [{
        marker: 'test',
        generate
    }]);
}

describe('build-in generators', () => {
    describe('match', () => {
        it('using string', () =>
            assert.deepEqual(
                gen(
                    'Hello world! Hello world!',
                    hitext.genMatches('world')
                ),
                [
                    { type: 'test', start: 6, end: 11, data: undefined },
                    { type: 'test', start: 19, end: 24, data: undefined }
                ]
            )
        );

        it('using regexp', () =>
            assert.deepEqual(
                gen(
                    'Hello world!',
                    hitext.genMatches(/\w+/)
                ),
                [
                    { type: 'test', start: 0, end: 5, data: undefined },
                    { type: 'test', start: 6, end: 11, data: undefined }
                ]
            )
        );

        it('using regexp with flags', () =>
            assert.deepEqual(
                gen(
                    'Hello world!',
                    hitext.genMatches(/hello|world/ig)
                ),
                [
                    { type: 'test', start: 0, end: 5, data: undefined },
                    { type: 'test', start: 6, end: 11, data: undefined }
                ]
            )
        );

        it('using non-string and non-regexp value', () =>
            assert.deepEqual(
                gen(
                    '1234567890',
                    hitext.genMatches(234)
                ),
                [
                    { type: 'test', start: 1, end: 4, data: undefined }
                ]
            )
        );
    });

    describe('line', () => {
        it('new-line ending input', () =>
            assert.deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\r',
                    hitext.genLines
                ),
                [
                    { type: 'test', start: 0, end: 1, data: 1 },
                    { type: 'test', start: 1, end: 3, data: 2 },
                    { type: 'test', start: 3, end: 7, data: 3 },
                    { type: 'test', start: 7, end: 11, data: 4 },
                    { type: 'test', start: 11, end: 12, data: 5 },
                    { type: 'test', start: 12, end: 12, data: 6 }
                ]
            )
        );

        it('non-new-line ending input', () =>
            assert.deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\rdddd',
                    hitext.genLines
                ),
                [
                    { type: 'test', start: 0, end: 1, data: 1 },
                    { type: 'test', start: 1, end: 3, data: 2 },
                    { type: 'test', start: 3, end: 7, data: 3 },
                    { type: 'test', start: 7, end: 11, data: 4 },
                    { type: 'test', start: 11, end: 12, data: 5 },
                    { type: 'test', start: 12, end: 16, data: 6 }
                ]
            )
        );
    });

    describe('lineContent', () => {
        it('new-line ending input', () =>
            assert.deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\r',
                    hitext.genLineContents
                ),
                [
                    { type: 'test', start: 0, end: 0, data: 1 },
                    { type: 'test', start: 1, end: 2, data: 2 },
                    { type: 'test', start: 3, end: 5, data: 3 },
                    { type: 'test', start: 7, end: 10, data: 4 },
                    { type: 'test', start: 11, end: 11, data: 5 },
                    { type: 'test', start: 12, end: 12, data: 6 }
                ]
            )
        );

        it('non-new-line ending input', () =>
            assert.deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\rdddd',
                    hitext.genLineContents
                ),
                [
                    { type: 'test', start: 0, end: 0, data: 1 },
                    { type: 'test', start: 1, end: 2, data: 2 },
                    { type: 'test', start: 3, end: 5, data: 3 },
                    { type: 'test', start: 7, end: 10, data: 4 },
                    { type: 'test', start: 11, end: 11, data: 5 },
                    { type: 'test', start: 12, end: 16, data: 6 }
                ]
            )
        );
    });

    describe('newLine', () => {
        it('new-line ending input', () =>
            assert.deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\r',
                    hitext.genNewLines
                ),
                [
                    { type: 'test', start: 0, end: 1, data: 1 },
                    { type: 'test', start: 2, end: 3, data: 2 },
                    { type: 'test', start: 5, end: 7, data: 3 },
                    { type: 'test', start: 10, end: 11, data: 4 },
                    { type: 'test', start: 11, end: 12, data: 5 }
                ]
            )
        );

        it('non-new-line ending input', () =>
            assert.deepEqual(
                gen(
                    '\na\rbb\r\nccc\n\rdddd',
                    hitext.genNewLines
                ),
                [
                    { type: 'test', start: 0, end: 1, data: 1 },
                    { type: 'test', start: 2, end: 3, data: 2 },
                    { type: 'test', start: 5, end: 7, data: 3 },
                    { type: 'test', start: 10, end: 11, data: 4 },
                    { type: 'test', start: 11, end: 12, data: 5 }
                ]
            )
        );
    });
});

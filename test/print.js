const assert = require('assert');
const hitext = require('../src');

const testPrinter = {
    hooks: {
        test: {
            open: x => `<${x}>`,
            close: x => `</${x}>`
        }
    }
};

const generateRanges = lines =>
    lines.map(line => {
        const m = line.match(/(\S)(\1*)/);
        return {
            type: 'test',
            start: m.index,
            end: m.index + m[0].length,
            data: m[1]
        };
    });

describe('print', () => {
    it('basic', () => {
        assert.equal(
            hitext.print(
                'abc',
                [
                    { type: 'test', start: 0, end: 1, data: 'a' },
                    { type: 'test', start: 1, end: 2, data: 'b' },
                    { type: 'test', start: 2, end: 3, data: 'c' }
                ],
                testPrinter
            ),
            '<a>a</a><b>b</b><c>c</c>'
        );
    });

    it('should be tolerant to unknown token types', () => {
        assert.equal(
            hitext.print(
                'abc',
                [
                    { type: 'unknown', start: 0, end: 1, data: 'a' },
                    { type: 'test', start: 1, end: 2, data: 'b' },
                    { type: 'uncomplete', start: 2, end: 3, data: 'c' }
                ],
                {
                    hooks: {
                        test: testPrinter.hooks.test,
                        uncomplete: {}
                    }
                }
            ),
            'a<b>b</b>c'
        );
    });

    describe('ranges out of source boundaries', () => {
        it('intersect with boundaries', () => {
            assert.equal(
                hitext.print(
                    'abc',
                    [
                        { type: 'test', start: -9, end: 9, data: 'a' },
                        { type: 'test', start: -8, end: 1, data: 'b' },
                        { type: 'test', start: 2, end: 9, data: 'c' }
                    ],
                    testPrinter
                ),
                '<a><b>a</b>b<c>c</c></a>'
            );
        });

        it('intersect with boundaries', () => {
            assert.equal(
                hitext.print(
                    'abc',
                    [
                        { type: 'test', start: -9, end: -5, data: 'a' },
                        { type: 'test', start: 1, end: 2, data: 'b' },
                        { type: 'test', start: 5, end: 9, data: 'c' }
                    ],
                    testPrinter
                ),
                '<a></a>a<b>b</b>c<c></c>'
            );
        });
    });

    it('should ignore ranges with bad start/end', () => {
        assert.equal(
            hitext.print(
                '1234567890',
                [
                    { type: 'test', start: NaN, end: 2, data: 'a' },
                    { type: 'test', start: undefined, end: 2, data: 'a' },
                    { type: 'test', start: null, end: 2, data: 'a' },
                    { type: 'test', start: false, end: 2, data: 'a' },
                    { type: 'test', start: '1', end: 2, data: 'a' },
                    { type: 'test', start: 6, end: 3, data: 'b' },
                    { type: 'test', start: 8, end: NaN, data: 'c' },
                    { type: 'test', start: 8, end: undefined, data: 'c' },
                    { type: 'test', start: 8, end: null, data: 'c' },
                    { type: 'test', start: 8, end: false, data: 'c' },
                    { type: 'test', start: 8, end: '1', data: 'c' },
                    { type: 'test', start: NaN, end: NaN, data: 'd' },
                    { type: 'test', start: 3, end: 6, data: 'e' }
                ],
                testPrinter
            ),
            '123<e>456</e>7890'
        );
    });

    it('order of ranges should be independant of generator order', () => {
        const printer = {
            hooks: {
                'a': testPrinter.hooks.test,
                'b': testPrinter.hooks.test
            }
        };
        const a = { type: 'a', start: 1, end: 2, data: 'a' };
        const b = { type: 'b', start: 1, end: 2, data: 'b' };

        assert.equal(
            hitext.print('123', [a, b], printer),
            hitext.print('123', [b, a], printer)
        );

        assert.equal(
            hitext.print('123', [b, a], printer),
            '1<a><b>2</b></a>3'
        );
    });

    [
        {
            ranges: [
                'aaaaaaaaaa',
                '  bbbbbb  '
            ],
            expected: '<a>12<b>345678</b>90</a>'
        },
        {
            ranges: [
                '  bbbbbb  ',
                'aaaaaaaaaa'
            ],
            expected: '<a>12<b>345678</b>90</a>'
        },
        {
            ranges: [
                'aaaaaaaaaa',
                'bbbbb     '
            ],
            expected: '<a><b>12345</b>67890</a>'
        },
        {
            ranges: [
                'bbbbb     ',
                'aaaaaaaaaa'
            ],
            expected: '<a><b>12345</b>67890</a>'
        },
        {
            ranges: [
                'aaaaaaaaaa',
                '     bbbbb'
            ],
            expected: '<a>12345<b>67890</b></a>'
        },
        {
            ranges: [
                '     bbbbb',
                'aaaaaaaaaa'
            ],
            expected: '<a>12345<b>67890</b></a>'
        },
        {
            ranges: [
                'aaaaa     ',
                '     bbbbb'
            ],
            expected: '<a>12345</a><b>67890</b>'
        },
        {
            ranges: [
                '     bbbbb',
                'aaaaa     '
            ],
            expected: '<a>12345</a><b>67890</b>'
        },
        {
            ranges: [
                'aaaaaaaaaa',
                '  bbbbbb  ',
                '    cc    ',
                '    dd    '
            ],
            expected: '<a>12<b>34<c><d>56</d></c>78</b>90</a>'
        },
        {
            ranges: [
                'aaaaaa    ',
                '    bbbbbb'
            ],
            expected: '<a>1234</a><b><a>56</a>7890</b>'
        },
        {
            ranges: [
                '    bbbbbb',
                'aaaaaa    '
            ],
            expected: '<a>1234</a><b><a>56</a>7890</b>'
        },
        {
            ranges: [
                'aaaaaaaa  ',
                '    bbbbbb',
                '     cc   '
            ],
            expected: '<a>1234</a><b><a>5<c>67</c>8</a>90</b>'
        },
        {
            ranges: [
                'aaaaaaa   ',
                '  bbbbbb  ',
                '    cccccc'
            ],
            expected: '<a>12</a><b><a>34</a></b><c><b><a>567</a>8</b>90</c>'
        },
        {
            ranges: [
                'aaaaa     ',
                '   bbbb   ',
                '     ccccc'
            ],
            expected: '<a>123</a><b><a>45</a></b><c><b>67</b>890</c>'
        },
        {
            ranges: [
                'aaaaaaa   ',
                '  bbbbbbb ',
                '    ccc   '
            ],
            expected: '<a>12</a><b><a>34<c>567</c></a>89</b>0'
        }
    ].forEach(test =>
        it('case\n|' + test.ranges.join('|\n|') + '|', () => {
            assert.equal(
                hitext.print(
                    '1234567890',
                    generateRanges(test.ranges),
                    testPrinter
                ),
                test.expected
            );
        })
    );
});

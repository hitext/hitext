const assert = require('assert');
const mode = require('./helpers/mode');
const print = require('../src/print');

const testPrinter = {
    ranges: {
        test: {
            open: ({ data: x }) => `<${x}>`,
            close: ({ data: x }) => `</${x}>`
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
    if (mode !== 'src') {
        return;
    }

    it('basic', () => {
        assert.equal(
            print(
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
            print(
                'abc',
                [
                    { type: 'unknown', start: 0, end: 1, data: 'a' },
                    { type: 'test', start: 1, end: 2, data: 'b' },
                    { type: 'uncomplete', start: 2, end: 3, data: 'c' }
                ],
                {
                    ranges: {
                        test: testPrinter.ranges.test,
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
                print(
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
                print(
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
            print(
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
            ranges: {
                'a': testPrinter.ranges.test,
                'b': testPrinter.ranges.test
            }
        };
        const a = { type: 'a', start: 1, end: 2, data: 'a' };
        const b = { type: 'b', start: 1, end: 2, data: 'b' };

        assert.equal(
            print('123', [a, b], printer),
            print('123', [b, a], printer)
        );

        assert.equal(
            print('123', [b, a], printer),
            '1<a><b>2</b></a>3'
        );
    });

    it('should be fine when open/close is omitted in printer range hook', () => {
        const a = { type: 'a', start: 1, end: 2 };
        const b = { type: 'b', start: 2, end: 3 };
        const c = { type: 'c', start: 3, end: 4 };

        assert.equal(
            print('123456', [a, b, c], {
                ranges: {
                    a: {
                        open: () => '<a>',
                        close: () => '</a>'
                    },
                    b: {
                        open() {},
                        close() {}
                    },
                    c: {}
                }
            }),
            '1<a>2</a>3456'
        );
    });

    it('should use range hook print method when defined', () => {
        const ranges = [
            { type: 'a', start: 1, end: 6 },
            { type: 'b', start: 2, end: 5 },
            { type: 'c', start: 3, end: 4 },
            { type: 'a', start: 8, end: 10 }
        ];

        assert.equal(
            print('1234567890', ranges, {
                print: chunk => chunk.replace(/./g, '_'),
                ranges: {
                    a: {
                        print: chunk => chunk.replace(/./g, 'a')
                    },
                    b: {
                        print: chunk => chunk.replace(/./g, 'b')
                    },
                    c: {}
                }
            }),
            '_ab_ba__aa'
        );
    });

    describe('print context', () => {
        const source = 'Hello, World!';
        const ranges = [[1, 5], [1, 2], [4, 8], [3, 5]].map(([start, end], idx) => {
            const range = {
                type: 'test',
                start,
                end,
                data: {
                    idx
                }
            };
            range.data.test = range.data;
            return range;
        });

        it('range data', () => {
            const actual = print(source, ranges, {
                ranges: {
                    test: {
                        open({ data }) {
                            return '[' + (data.test === data ? 'ok' : 'fail') + ']';
                        },
                        close({ data }) {
                            return '[/' + (data.test === data ? 'ok' : 'fail') + ']';
                        }
                    }
                }
            });

            assert.strictEqual(
                actual,
                'H[ok][ok]e[/ok]l[ok]l[/ok][/ok][ok][ok][ok]o[/ok][/ok], W[/ok]orld!'
            );
        });

        it('range start/end', () => {
            const actual = print(source, ranges, {
                ranges: {
                    test: {
                        open({ data: { idx }, start, offset }) {
                            return '[' + (start === offset ? 'start' : 'start-continue') + '-' + idx + ']';
                        },
                        close({ data: { idx }, end, offset }) {
                            return '[/' + (end === offset ? 'end' : 'temp-end') + '-' + idx + ']';
                        }
                    }
                }
            });

            assert.strictEqual(
                actual,
                'H[start-0][start-1]e[/end-1]l[start-3]l[/temp-end-3][/temp-end-0][start-2][start-continue-0][start-continue-3]o[/end-3][/end-0], W[/end-2]orld!'
            );
        });

        it('location', () => {
            const source = '1\n2\r3\r\n4';
            const ranges = source.split('').map((c, idx) => ({ type: 'test', start: idx, end: idx + 1 }));
            const actual = print(source, ranges, {
                ranges: {
                    test: {
                        open({ offset, line, column }) {
                            return '[' + [offset, line, column].join(':') + ']';
                        },
                        close({ offset, line, column }) {
                            return '[/' + [offset, line, column].join(':') + ']';
                        }
                    }
                }
            });

            assert.strictEqual(actual, [
                '[0:1:1]1[/1:1:2][1:1:2]\n' +
                '[/2:2:1][2:2:1]2[/3:2:2][3:2:2]\r' +
                '[/4:3:1][4:3:1]3[/5:3:2][5:3:2]\r[/6:3:3][6:3:3]\n' +
                '[/7:4:1][7:4:1]4[/8:4:2]'
            ].join(''));
        });
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
                print(
                    '1234567890',
                    generateRanges(test.ranges),
                    testPrinter
                ),
                test.expected
            );
        })
    );
});

import { equal, strictEqual } from 'assert';
import { print } from '../src/index.js';
import type { Printer, GeneratedRange, PrinterHookContext } from '../src/types.d.js';

const testPrinter: Printer = {
    hooks: {
        test: {
            before: ({ data: x }) => `<${x}>`,
            after: ({ data: x }) => `</${x}>`
        }
    },
    fork: () => testPrinter,
    createHook: fn => fn()
};

const generateRanges = (lines: string[]): GeneratedRange[] =>
    lines.map(line => {
        const m = line.match(/(\S)(\1*)/);
        return {
            type: 'test',
            start: m!.index!,
            end: m!.index! + m![0].length,
            data: m![1]
        };
    });

describe('print', () => {
    it('basic', () => {
        equal(
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
        equal(
            print(
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
                    },
                    fork: () => testPrinter,
                    createHook: (fn: Function) => fn()
                }
            ),
            'a<b>b</b>c'
        );
    });

    describe('ranges out of source boundaries', () => {
        it('intersect with boundaries', () => {
            equal(
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
            equal(
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
        equal(
            print(
                '1234567890',
                [
                    { type: 'test', start: NaN, end: 2, data: 'a' },
                    { type: 'test', start: undefined as any, end: 2, data: 'a' },
                    { type: 'test', start: null as any, end: 2, data: 'a' },
                    { type: 'test', start: false as any, end: 2, data: 'a' },
                    { type: 'test', start: '1' as any, end: 2, data: 'a' },
                    { type: 'test', start: 6, end: 3, data: 'b' },
                    { type: 'test', start: 8, end: NaN, data: 'c' },
                    { type: 'test', start: 8, end: undefined as any, data: 'c' },
                    { type: 'test', start: 8, end: null as any, data: 'c' },
                    { type: 'test', start: 8, end: false as any, data: 'c' },
                    { type: 'test', start: 8, end: '1' as any, data: 'c' },
                    { type: 'test', start: NaN, end: NaN, data: 'd' },
                    { type: 'test', start: 3, end: 6, data: 'e' }
                ],
                testPrinter
            ),
            '123<e>456</e>7890'
        );
    });

    it('order of ranges should be independant of generator order', () => {
        const printer: Printer = {
            hooks: {
                'a': testPrinter.hooks!.test,
                'b': testPrinter.hooks!.test
            },
            fork: () => printer,
            createHook: (fn: Function) => fn()
        };
        const a: GeneratedRange = { type: 'a', start: 1, end: 2, data: 'a' };
        const b: GeneratedRange = { type: 'b', start: 1, end: 2, data: 'b' };

        equal(
            print('123', [a, b], printer),
            print('123', [b, a], printer)
        );

        equal(
            print('123', [b, a], printer),
            '1<a><b>2</b></a>3'
        );
    });

    it('should be fine when open/close is omitted in printer range hook', () => {
        const a: GeneratedRange = { type: 'a', start: 1, end: 2, data: undefined };
        const b: GeneratedRange = { type: 'b', start: 2, end: 3, data: undefined };
        const c: GeneratedRange = { type: 'c', start: 3, end: 4, data: undefined };

        equal(
            print('123456', [a, b, c], {
                hooks: {
                    a: {
                        before: () => '<a>',
                        after: () => '</a>'
                    },
                    b: {
                        before: () => '',
                        after: () => ''
                    },
                    c: {}
                },
                fork: () => testPrinter,
                createHook: (fn: Function) => fn()
            }),
            '1<a>2</a>3456'
        );
    });

    it('should use range hook text method when defined', () => {
        const ranges: GeneratedRange[] = [
            { type: 'a', start: 1, end: 6, data: undefined },
            { type: 'b', start: 2, end: 5, data: undefined },
            { type: 'c', start: 3, end: 4, data: undefined },
            { type: 'a', start: 8, end: 10, data: undefined }
        ];

        equal(
            print('1234567890', ranges, {
                text: (chunk: string) => chunk.replace(/./g, '_'),
                hooks: {
                    a: {
                        text: (chunk: string) => chunk.replace(/./g, 'a')
                    },
                    b: {
                        text: (chunk: string) => chunk.replace(/./g, 'b')
                    },
                    c: {}
                },
                fork: () => testPrinter,
                createHook: (fn: Function) => fn()
            }),
            '_ab_ba__aa'
        );
    });

    describe('print context', () => {
        const source = 'Hello, World!';
        interface TestData {
            idx: number;
            test?: TestData;
        }
        const ranges = [[1, 5], [1, 2], [4, 8], [3, 5]].map(([start, end], idx) => {
            const range: GeneratedRange<TestData> = {
                type: 'test',
                start,
                end,
                data: {
                    idx
                }
            };
            range.data!.test = range.data;
            return range;
        });

        it('range data', () => {
            const actual = print(source, ranges, {
                hooks: {
                    test: {
                        before({ data }: PrinterHookContext<TestData>) {
                            return '[' + (data.test === data ? 'ok' : 'fail') + ']';
                        },
                        after({ data }: PrinterHookContext<TestData>) {
                            return '[/' + (data.test === data ? 'ok' : 'fail') + ']';
                        }
                    }
                },
                fork: () => testPrinter as any,
                createHook: (fn: Function) => fn()
            });

            strictEqual(
                actual,
                'H[ok][ok]e[/ok]l[ok]l[/ok][/ok][ok][ok][ok]o[/ok][/ok], W[/ok]orld!'
            );
        });

        it('range start/end', () => {
            const actual = print(source, ranges, {
                hooks: {
                    test: {
                        before({ data, start, offset }: PrinterHookContext<TestData>) {
                            return '[' + (start === offset ? 'start' : 'start-continue') + '-' + data.idx + ']';
                        },
                        after({ data, end, offset }: PrinterHookContext<TestData>) {
                            return '[/' + (end === offset ? 'end' : 'temp-end') + '-' + data.idx + ']';
                        }
                    }
                },
                fork: () => testPrinter as any,
                createHook: (fn: Function) => fn()
            });

            strictEqual(
                actual,
                'H[start-0][start-1]e[/end-1]l[start-3]l[/temp-end-3][/temp-end-0][start-2][start-continue-0][start-continue-3]o[/end-3][/end-0], W[/end-2]orld!'
            );
        });

        it('location', () => {
            const source = '1\n2\r3\r\n4';
            const ranges = source.split('').map((c, idx) => ({
                type: 'test' as const,
                start: idx,
                end: idx + 1
            }));
            const actual = print(source, ranges, {
                hooks: {
                    test: {
                        before({ offset, line, column }) {
                            return '[' + [offset, line, column].join(':') + ']';
                        },
                        after({ offset, line, column }) {
                            return '[/' + [offset, line, column].join(':') + ']';
                        }
                    }
                },
                fork: () => testPrinter,
                createHook: (fn: Function) => fn()
            });

            strictEqual(actual, [
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
            equal(
                print(
                    '1234567890',
                    generateRanges(test.ranges),
                    testPrinter
                ),
                test.expected
            );
        })
    );

    describe('node hook', () => {
        it('should work with node hook', () => {
            equal(
                print('Hello world!', [
                    { type: 'wrap', start: 6, end: 11, data: null }
                ], {
                    wrap: {
                        node: (content) => `[${content}]`
                    }
                }),
                'Hello [world]!'
            );
        });

        it('should support node hook combined with before/after hooks', () => {
            equal(
                print('Hello world!', [
                    { type: 'wrap', start: 6, end: 11, data: null }
                ], {
                    wrap: {
                        open: () => '<',
                        close: () => '>',
                        node: (content) => `[${content}]`
                    }
                }),
                'Hello <[world]>!'
            );
        });

        it('should support nested node hooks with before/after', () => {
            equal(
                print('Hello world!', [
                    { type: 'outer', start: 0, end: 12, data: null },
                    { type: 'inner', start: 6, end: 11, data: null }
                ], {
                    outer: {
                        open: () => '(',
                        close: () => ')',
                        node: (content) => `{${content}}`
                    },
                    inner: {
                        open: () => '<',
                        close: () => '>',
                        node: (content) => `[${content}]`
                    }
                }),
                '({Hello <[world]>!})'
            );
        });
    });
});

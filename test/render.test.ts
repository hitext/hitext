import { equal, strictEqual } from 'assert';
import { render } from '../src/index.js';
import type { GeneratedRange, RangeHookContext, RangeHooks, RangeMarker } from '../src/types.d.js';

const testHooks: Record<RangeMarker, Partial<RangeHooks<string, string>>> = {
    test: {
        open: ({ data: x }: RangeHookContext<string>) => `<${x}>`,
        close: ({ data: x }: RangeHookContext<string>) => `</${x}>`
    }
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

describe('render', () => {
    it('basic', () => {
        equal(
            render(
                'abc',
                [
                    { type: 'test', start: 0, end: 1, data: 'a' },
                    { type: 'test', start: 1, end: 2, data: 'b' },
                    { type: 'test', start: 2, end: 3, data: 'c' }
                ],
                testHooks
            ),
            '<a>a</a><b>b</b><c>c</c>'
        );
    });

    it('should be tolerant to unknown token types', () => {
        equal(
            render(
                'abc',
                [
                    { type: 'unknown', start: 0, end: 1, data: 'a' },
                    { type: 'test', start: 1, end: 2, data: 'b' },
                    { type: 'uncomplete', start: 2, end: 3, data: 'c' }
                ],
                {
                    test: testHooks.test,
                    uncomplete: {}
                }
            ),
            'a<b>b</b>c'
        );
    });

    describe('ranges out of source boundaries', () => {
        it('intersect with boundaries', () => {
            equal(
                render(
                    'abc',
                    [
                        { type: 'test', start: -9, end: 9, data: 'a' },
                        { type: 'test', start: -8, end: 1, data: 'b' },
                        { type: 'test', start: 2, end: 9, data: 'c' }
                    ],
                    testHooks
                ),
                '<a><b>a</b>b<c>c</c></a>'
            );
        });

        it('intersect with boundaries', () => {
            equal(
                render(
                    'abc',
                    [
                        { type: 'test', start: -9, end: -5, data: 'a' },
                        { type: 'test', start: 1, end: 2, data: 'b' },
                        { type: 'test', start: 5, end: 9, data: 'c' }
                    ],
                    testHooks
                ),
                '<a></a>a<b>b</b>c<c></c>'
            );
        });
    });

    it('should ignore ranges with bad start/end', () => {
        equal(
            render(
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
                testHooks
            ),
            '123<e>456</e>7890'
        );
    });

    it('order of ranges should be independant of generator order', () => {
        const hooks = {
            'a': testHooks.test,
            'b': testHooks.test
        };
        const a: GeneratedRange = { type: 'a', start: 1, end: 2, data: 'a' };
        const b: GeneratedRange = { type: 'b', start: 1, end: 2, data: 'b' };

        equal(
            render('123', [a, b], hooks),
            render('123', [b, a], hooks)
        );

        equal(
            render('123', [b, a], hooks),
            '1<a><b>2</b></a>3'
        );
    });

    it('should be fine when open/close is omitted in printer range hook', () => {
        const a: GeneratedRange = { type: 'a', start: 1, end: 2, data: undefined };
        const b: GeneratedRange = { type: 'b', start: 2, end: 3, data: undefined };
        const c: GeneratedRange = { type: 'c', start: 3, end: 4, data: undefined };

        equal(
            render('123456', [a, b, c], {
                a: {
                    open: () => '<a>',
                    close: () => '</a>'
                },
                b: {
                    open: () => '',
                    close: () => ''
                },
                c: {}
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
            render('1234567890', ranges, {
                a: {
                    text: (chunk: string) => chunk.replace(/./g, 'a')
                },
                b: {
                    text: (chunk: string) => chunk.replace(/./g, 'b')
                },
                c: {}
            }, {
                text: (chunk: string) => chunk.replace(/./g, '_')
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
            const actual = render(source, ranges, {
                test: {
                    open({ data }: RangeHookContext<TestData>) {
                        return '[' + (data.test === data ? 'ok' : 'fail') + ']';
                    },
                    close({ data }: RangeHookContext<TestData>) {
                        return '[/' + (data.test === data ? 'ok' : 'fail') + ']';
                    }
                }
            });

            strictEqual(
                actual,
                'H[ok][ok]e[/ok]l[ok]l[/ok][/ok][ok][ok][ok]o[/ok][/ok], W[/ok]orld!'
            );
        });

        it('range start/end', () => {
            const actual = render(source, ranges, {
                test: {
                    open({ data, start, offset }: RangeHookContext<TestData>) {
                        return '[' + (start === offset ? 'start' : 'start-continue') + '-' + data.idx + ']';
                    },
                    close({ data, end, offset }: RangeHookContext<TestData>) {
                        return '[/' + (end === offset ? 'end' : 'temp-end') + '-' + data.idx + ']';
                    }
                }
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
                end: idx + 1,
                data: {}
            }));
            const actual = render(source, ranges, {
                test: {
                    open({ offset, line, column }: RangeHookContext<Record<string, never>>) {
                        return '[' + [offset, line, column].join(':') + ']';
                    },
                    close({ offset, line, column }: RangeHookContext<Record<string, never>>) {
                        return '[/' + [offset, line, column].join(':') + ']';
                    }
                }
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
                render(
                    '1234567890',
                    generateRanges(test.ranges),
                    testHooks
                ),
                test.expected
            );
        })
    );

    describe('node hook', () => {
        it('should work with node hook', () => {
            equal(
                render('Hello world!', [
                    { type: 'wrap', start: 6, end: 11, data: null }
                ], {
                    wrap: {
                        range: (content) => `[${content}]`
                    }
                }),
                'Hello [world]!'
            );
        });

        it('should support node hook combined with before/after hooks', () => {
            equal(
                render('Hello world!', [
                    { type: 'wrap', start: 6, end: 11, data: null }
                ], {
                    wrap: {
                        open: () => '<',
                        close: () => '>',
                        range: (content) => `[${content}]`
                    }
                }),
                'Hello <[world]>!'
            );
        });

        it('should support nested node hooks with before/after', () => {
            equal(
                render('Hello world!', [
                    { type: 'outer', start: 0, end: 12, data: null },
                    { type: 'inner', start: 6, end: 11, data: null }
                ], {
                    outer: {
                        open: () => '(',
                        close: () => ')',
                        range: (content) => `{${content}}`
                    },
                    inner: {
                        open: () => '<',
                        close: () => '>',
                        range: (content) => `[${content}]`
                    }
                }),
                '({Hello <[world]>!})'
            );
        });

        it('should support node hook with data context', () => {
            equal(
                render('Hello world!', [
                    { type: 'greeting', start: 0, end: 5, data: { type: 'greeting' } }
                ], {
                    greeting: {
                        range: (content, { data }: RangeHookContext<{ type: string }>) =>
                            `<span class="${data.type}">${content}</span>`
                    }
                }),
                '<span class="greeting">Hello</span> world!'
            );
        });

        it('should allow skipping content by not using content parameter', () => {
            equal(
                render('Hello world!', [
                    { type: 'word', start: 0, end: 5, data: { secret: false } },
                    { type: 'word', start: 6, end: 11, data: { secret: true } }
                ], {
                    word: {
                        range: (content, { data }: RangeHookContext<{ secret: boolean }>) =>
                            data.secret ? '[REDACTED]' : content
                    }
                }),
                'Hello [REDACTED]!'
            );
        });

        it('should provide correct context in node hook', () => {
            let capturedContext: RangeHookContext<{ foo: string }> | null = null;

            render('Hello\nworld!', [
                { type: 'test', start: 6, end: 11, data: { foo: 'bar' } }
            ], {
                test: {
                    range: (content, context: RangeHookContext<{ foo: string }>) => {
                        capturedContext = context;
                        return content;
                    }
                }
            });

            strictEqual(capturedContext!.start, 6);
            strictEqual(capturedContext!.end, 11);
            strictEqual(capturedContext!.line, 2);
            strictEqual(capturedContext!.data.foo, 'bar');
            // Note: offset/column in node hook context may vary based on when it's called
        });

        it('should handle deeply nested node hooks', () => {
            equal(
                render('content', [
                    { type: 'level1', start: 0, end: 7, data: null },
                    { type: 'level2', start: 0, end: 7, data: null },
                    { type: 'level3', start: 0, end: 7, data: null }
                ], {
                    level1: {
                        range: (content) => `<L1>${content}</L1>`
                    },
                    level2: {
                        range: (content) => `<L2>${content}</L2>`
                    },
                    level3: {
                        range: (content) => `<L3>${content}</L3>`
                    }
                }),
                '<L1><L2><L3>content</L3></L2></L1>'
            );
        });

        it('should handle node hook with empty content', () => {
            equal(
                render('before after', [
                    { type: 'empty', start: 6, end: 6, data: null }
                ], {
                    empty: {
                        range: (content) => `<empty>${content}</empty>`
                    }
                }),
                'before<empty></empty> after'
            );
        });

        it('should handle multiple non-overlapping node hooks', () => {
            equal(
                render('One Two Three', [
                    { type: 'tag', start: 0, end: 3, data: 'a' },
                    { type: 'tag', start: 4, end: 7, data: 'b' },
                    { type: 'tag', start: 8, end: 13, data: 'c' }
                ], {
                    tag: {
                        range: (content, { data }: RangeHookContext<string>) =>
                            `<${data}>${content}</${data}>`
                    }
                }),
                '<a>One</a> <b>Two</b> <c>Three</c>'
            );
        });

        it('should support node hook returning non-string values', () => {
            equal(
                render('The answer is 21', [
                    { type: 'number', start: 14, end: 16, data: null }
                ], {
                    number: {
                        range: (content) => {
                            const num = parseInt(content as string);
                            return String(num * 2);
                        }
                    }
                }),
                'The answer is 42'
            );
        });
    });
});

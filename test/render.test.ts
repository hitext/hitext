import { strictEqual, deepStrictEqual } from 'assert';
import { render } from '../src/index.js';
import type {
    GeneratedRange,
    RangeHookContext,
    RangeHookContextDump,
    RangeHooksDefinitionMap
} from '../src/types.js';

const testHooks: RangeHooksDefinitionMap<any, any> = {
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
        strictEqual(
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
        strictEqual(
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

    describe('ranges out of document boundaries', () => {
        it('intersect with boundaries', () => {
            strictEqual(
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
            strictEqual(
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
        strictEqual(
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

        strictEqual(
            render('123', [a, b], hooks),
            render('123', [b, a], hooks)
        );

        strictEqual(
            render('123', [b, a], hooks),
            '1<a><b>2</b></a>3'
        );
    });

    it('should be fine when open/close is omitted in printer range hook', () => {
        const a: GeneratedRange = { type: 'a', start: 1, end: 2 };
        const b: GeneratedRange = { type: 'b', start: 2, end: 3 };
        const c: GeneratedRange = { type: 'c', start: 3, end: 4 };

        strictEqual(
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
            strictEqual(
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
            strictEqual(
                render('Hello world!', [
                    { type: 'wrap', start: 6, end: 11, data: null }
                ], {
                    wrap: (content) => `[${content}]`
                }),
                'Hello [world]!'
            );
        });

        it('should support node hook combined with before/after hooks', () => {
            strictEqual(
                render('Hello world!', [
                    { type: 'wrap', start: 6, end: 11, data: null }
                ], {
                    wrap: {
                        open: () => '<',
                        close: () => '>',
                        wrap: (content) => `[${content}]`
                    }
                }),
                'Hello <[world]>!'
            );
        });

        it('should support nested node hooks with before/after', () => {
            strictEqual(
                render('Hello world!', [
                    { type: 'outer', start: 0, end: 12, data: null },
                    { type: 'inner', start: 6, end: 11, data: null }
                ], {
                    outer: {
                        open: () => '(',
                        close: () => ')',
                        wrap: (content) => `{${content}}`
                    },
                    inner: {
                        open: () => '<',
                        close: () => '>',
                        wrap: (content) => `[${content}]`
                    }
                }),
                '({Hello <[world]>!})'
            );
        });

        it('should support node hook with data context', () => {
            strictEqual(
                render('Hello world!', [
                    { type: 'greeting', start: 0, end: 5, data: { type: 'greeting' } }
                ], {
                    greeting: (content, { data }: RangeHookContext<{ type: string }>) =>
                        `<span class="${data.type}">${content}</span>`
                }),
                '<span class="greeting">Hello</span> world!'
            );
        });

        it('should allow skipping content by not using content parameter', () => {
            strictEqual(
                render('Hello world!', [
                    { type: 'word', start: 0, end: 5, data: { secret: false } },
                    { type: 'word', start: 6, end: 11, data: { secret: true } }
                ], {
                    word: (content, { data }: RangeHookContext<{ secret: boolean }>) =>
                        data.secret ? '[REDACTED]' : content
                }),
                'Hello [REDACTED]!'
            );
        });

        it('should provide correct context in node hook', () => {
            const range = { type: 'test', start: 6, end: 11, data: { foo: 'bar' } };
            let capturedContext: RangeHookContextDump<{ foo: string }> | null = null;

            render('Hello\nworld!', [range], {
                test(content, context: RangeHookContext<{ foo: string }>) {
                    capturedContext = context.dump();
                    return content;
                }
            });

            deepStrictEqual(capturedContext, {
                hook: 'wrap',
                document: 'Hello\nworld!',
                offset: 11,
                line: 2,
                column: 6,
                start: 6,
                end: 11,
                rangeIndex: 0,
                rangeText: 'world',
                range,
                data: {
                    foo: 'bar'
                }
            });
        });

        it('should handle deeply nested node hooks', () => {
            strictEqual(
                render('content', [
                    { type: 'level1', start: 0, end: 7, data: null },
                    { type: 'level2', start: 0, end: 7, data: null },
                    { type: 'level3', start: 0, end: 7, data: null }
                ], {
                    level1: (content) => `<L1>${content}</L1>`,
                    level2: (content) => `<L2>${content}</L2>`,
                    level3: (content) => `<L3>${content}</L3>`
                }),
                '<L1><L2><L3>content</L3></L2></L1>'
            );
        });

        it('should handle node hook with empty content', () => {
            strictEqual(
                render('before after', [
                    { type: 'empty', start: 6, end: 6, data: null }
                ], {
                    empty: (content) => `<empty>${content}</empty>`
                }),
                'before<empty></empty> after'
            );
        });

        it('should handle multiple non-overlapping node hooks', () => {
            strictEqual(
                render('One Two Three', [
                    { type: 'tag', start: 0, end: 3, data: 'a' },
                    { type: 'tag', start: 4, end: 7, data: 'b' },
                    { type: 'tag', start: 8, end: 13, data: 'c' }
                ], {
                    tag: (content, { data }: RangeHookContext<string>) =>
                        `<${data}>${content}</${data}>`
                }),
                '<a>One</a> <b>Two</b> <c>Three</c>'
            );
        });

        it('should support node hook returning non-string values', () => {
            strictEqual(
                render('The answer is 21', [
                    { type: 'number', start: 14, end: 16, data: null }
                ], {
                    number(content) {
                        const num = parseInt(content as string);
                        return num * 2;
                    }
                }),
                'The answer is 42'
            );
        });
    });
});

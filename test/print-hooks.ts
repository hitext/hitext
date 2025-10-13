import { equal, strictEqual } from 'assert';
import print from '../src/print.js';
import type { Printer, PrinterHookContext } from '../src/types.d.js';

describe('print hooks', () => {
    describe('node hook', () => {
        it('should support basic node hook', () => {
            const printer: Printer = {
                ranges: {
                    greeting: {
                        node: (content, { data }) => `<span class="${data.type}">${content}</span>`
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [{ type: 'greeting', start: 0, end: 5, data: { type: 'greeting' } }],
                    printer
                ),
                '<span class="greeting">Hello</span> world!'
            );
        });

        it('should support nested node hooks', () => {
            const printer: Printer = {
                ranges: {
                    sentence: {
                        node: (content) => `<p>${content}</p>`
                    },
                    word: {
                        node: (content) => `<strong>${content}</strong>`
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [
                        { type: 'sentence', start: 0, end: 12, data: null },
                        { type: 'word', start: 6, end: 11, data: null }
                    ],
                    printer
                ),
                '<p>Hello <strong>world</strong>!</p>'
            );
        });

        it('should support mixing node hooks with open/close hooks', () => {
            const printer: Printer = {
                ranges: {
                    bracket: {
                        node: (content) => `[${content}]`
                    },
                    mark: {
                        open: () => '<mark>',
                        close: () => '</mark>'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [
                        { type: 'bracket', start: 0, end: 12, data: null },
                        { type: 'mark', start: 6, end: 11, data: null }
                    ],
                    printer
                ),
                '[Hello <mark>world</mark>!]'
            );
        });

        it('should allow skipping content by not calling content()', () => {
            const printer: Printer = {
                ranges: {
                    word: {
                        node: (content, { data }) =>
                            data.secret ? '[REDACTED]' : content
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [
                        { type: 'word', start: 0, end: 5, data: { secret: false } },
                        { type: 'word', start: 6, end: 11, data: { secret: true } }
                    ],
                    printer
                ),
                'Hello [REDACTED]!'
            );
        });

        it('should provide correct context (offset, line, column)', () => {
            let capturedContext: any = null;
            const printer: Printer = {
                ranges: {
                    test: {
                        node: (content, context: PrinterHookContext) => {
                            capturedContext = {
                                start: context.start,
                                end: context.end,
                                line: context.line,
                                column: context.column,
                                offset: context.offset,
                                data: context.data
                            };
                            return content;
                        }
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            print('Hello\nworld!', [
                { type: 'test', start: 6, end: 11, data: { foo: 'bar' } }
            ], printer);

            strictEqual(capturedContext.start, 6);
            strictEqual(capturedContext.end, 11);
            strictEqual(capturedContext.line, 2);
            strictEqual(capturedContext.column, 6);
            strictEqual(capturedContext.data.foo, 'bar');
        });

        it('should handle deeply nested node hooks', () => {
            const printer: Printer = {
                ranges: {
                    level1: {
                        node: (content) => `<L1>${content}</L1>`
                    },
                    level2: {
                        node: (content) => `<L2>${content}</L2>`
                    },
                    level3: {
                        node: (content) => `<L3>${content}</L3>`
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'content',
                    [
                        { type: 'level1', start: 0, end: 7, data: null },
                        { type: 'level2', start: 0, end: 7, data: null },
                        { type: 'level3', start: 0, end: 7, data: null }
                    ],
                    printer
                ),
                '<L1><L2><L3>content</L3></L2></L1>'
            );
        });

        it('should handle node hook with empty content', () => {
            const printer: Printer = {
                ranges: {
                    empty: {
                        node: (content) => `<empty>${content}</empty>`
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'before after',
                    [{ type: 'empty', start: 6, end: 6, data: null }],
                    printer
                ),
                'before<empty></empty> after'
            );
        });

        it('should handle multiple non-overlapping node hooks', () => {
            const printer: Printer = {
                ranges: {
                    tag: {
                        node: (content, { data }) => `<${data}>${content}</${data}>`
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'One Two Three',
                    [
                        { type: 'tag', start: 0, end: 3, data: 'a' },
                        { type: 'tag', start: 4, end: 7, data: 'b' },
                        { type: 'tag', start: 8, end: 13, data: 'c' }
                    ],
                    printer
                ),
                '<a>One</a> <b>Two</b> <c>Three</c>'
            );
        });

        it('should support node hook returning non-string values', () => {
            const printer: Printer = {
                ranges: {
                    number: {
                        node: (content) => {
                            const num = parseInt(content);
                            return num * 2;
                        }
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'The answer is 21',
                    [{ type: 'number', start: 14, end: 16, data: null }],
                    printer
                ),
                'The answer is 42'
            );
        });
    });

    describe('before/after hooks', () => {
        it('should support before/after as aliases for open/close', () => {
            const printer: Printer = {
                ranges: {
                    mark: {
                        before: () => '<mark>',
                        after: () => '</mark>'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [{ type: 'mark', start: 6, end: 11, data: null }],
                    printer
                ),
                'Hello <mark>world</mark>!'
            );
        });

        it('should mix before/after with node hooks correctly', () => {
            const printer: Printer = {
                ranges: {
                    bracket: {
                        node: (content: any) => `[${content}]`
                    },
                    mark: {
                        before: () => '<mark>',
                        after: () => '</mark>'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [
                        { type: 'bracket', start: 0, end: 12, data: null },
                        { type: 'mark', start: 6, end: 11, data: null }
                    ],
                    printer
                ),
                '[Hello <mark>world</mark>!]'
            );
        });
    });

    describe('text hook', () => {
        it('should support text as alias for print', () => {
            const printer: Printer = {
                text: (chunk: string) => chunk.toUpperCase(),
                ranges: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print('Hello world!', [], printer),
                'HELLO WORLD!'
            );
        });

        it('should work with ranges', () => {
            const printer: Printer = {
                ranges: {
                    loud: {
                        text: (chunk: string) => chunk.toUpperCase()
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello world!',
                    [{ type: 'loud', start: 6, end: 11, data: null }],
                    printer
                ),
                'Hello WORLD!'
            );
        });
    });

    describe('API compatibility', () => {
        it('should prefer new API names (before/after/text) over legacy (open/close/print)', () => {
            const printer: Printer = {
                ranges: {
                    test: {
                        before: () => '[NEW]',
                        open: () => '[OLD]',
                        after: () => '[/NEW]',
                        close: () => '[/OLD]',
                        text: (chunk) => chunk.toUpperCase(),
                        print: (chunk) => chunk.toLowerCase()
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello',
                    [{ type: 'test', start: 0, end: 5, data: null }],
                    printer
                ),
                '[NEW]HELLO[/NEW]'
            );
        });

        it('should fall back to legacy API when new API not provided', () => {
            const printer: Printer = {
                ranges: {
                    test: {
                        open: () => '<old>',
                        close: () => '</old>',
                        print: (chunk) => chunk.toUpperCase()
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            equal(
                print(
                    'Hello',
                    [{ type: 'test', start: 0, end: 5, data: null }],
                    printer
                ),
                '<old>HELLO</old>'
            );
        });
    });
});

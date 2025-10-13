import { equal, strictEqual } from 'assert';
import { print } from '../src/index.js';
import type { PrinterHookContext } from '../src/types.d.js';

describe.skip('print hooks', () => {
    describe('node hook', () => {
        it('should support basic node hook', () => {
            const printer = createPrinter({
                hooks: {
                    greeting: {
                        node: (content, { data }: PrinterHookContext<{ type: string }>) => `<span class="${data.type}">${content}</span>`
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    sentence: {
                        node: (content) => `<p>${content}</p>`
                    },
                    word: {
                        node: (content) => `<strong>${content}</strong>`
                    }
                }
            });

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

        it('should support mixing node hooks with before/after hooks', () => {
            const printer = createPrinter({
                hooks: {
                    bracket: {
                        node: (content) => `[${content}]`
                    },
                    mark: {
                        before: () => '<mark>',
                        after: () => '</mark>'
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    word: {
                        node: (content, { data }: PrinterHookContext<{ secret: boolean }>) =>
                            data.secret ? '[REDACTED]' : content
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
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
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    level1: {
                        node: (content) => `<L1>${content}</L1>`
                    },
                    level2: {
                        node: (content) => `<L2>${content}</L2>`
                    },
                    level3: {
                        node: (content) => `<L3>${content}</L3>`
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    empty: {
                        node: (content) => `<empty>${content}</empty>`
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    tag: {
                        node: (content, { data }: PrinterHookContext<string>) => `<${data}>${content}</${data}>`
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    number: {
                        node: (content) => {
                            const num = parseInt(content);
                            return num * 2;
                        }
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    mark: {
                        before: () => '<mark>',
                        after: () => '</mark>'
                    }
                }
            });

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
            const printer = createPrinter({
                hooks: {
                    bracket: {
                        node: (content: any) => `[${content}]`
                    },
                    mark: {
                        before: () => '<mark>',
                        after: () => '</mark>'
                    }
                }
            });

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
            const printer = createPrinter({
                text: (chunk: string) => chunk.toUpperCase(),
                hooks: {}
            });

            equal(
                print('Hello world!', [], printer),
                'HELLO WORLD!'
            );
        });

        it('should work with ranges', () => {
            const printer = createPrinter({
                hooks: {
                    loud: {
                        text: (chunk: string) => chunk.toUpperCase()
                    }
                }
            });

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
});

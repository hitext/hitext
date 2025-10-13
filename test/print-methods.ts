import { strictEqual } from 'assert';
import print from '../src/print.js';
import type { Printer, PrinterHookContext } from '../src/types.d.js';

describe('print methods', () => {
    describe('createRoot', () => {
        it('should use createRoot to initialize output buffer', () => {
            let rootCalled = false;
            const printer: Printer = {
                createRoot: () => {
                    rootCalled = true;
                    return 'ROOT:';
                },
                ranges: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('test', [], printer);
            strictEqual(rootCalled, true);
            strictEqual(result, 'ROOT:test');
        });

        it('should default to empty string when not provided', () => {
            const printer: Printer = {
                ranges: {
                    test: {
                        open: () => '<test>',
                        close: () => '</test>'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print(
                'content',
                [{ type: 'test', start: 0, end: 7, data: null }],
                printer
            );

            strictEqual(result, '<test>content</test>');
        });
    });

    describe('append', () => {
        it('should use append to combine buffer parts', () => {
            const calls: string[] = [];
            const printer: Printer = {
                createRoot: () => '',
                append: (buffer: string, content: string) => {
                    calls.push(`append(${JSON.stringify(content)})`);
                    return buffer + '[' + content + ']';
                },
                ranges: {
                    test: {
                        open: () => 'OPEN',
                        close: () => 'CLOSE'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            print(
                'test',
                [{ type: 'test', start: 0, end: 4, data: null }],
                printer
            );

            strictEqual(calls.length > 0, true);
            strictEqual(calls.some(c => c.includes('OPEN')), true);
            strictEqual(calls.some(c => c.includes('CLOSE')), true);
        });

        it('should work with array-based buffers', () => {
            const parts: any[] = [];
            const printer: Printer = {
                createRoot: () => [],
                append: (parent: any[], child: any) => {
                    parts.push(child);
                    parent.push(child);
                    return parent;
                },
                ranges: {
                    mark: {
                        open: () => '<mark>',
                        close: () => '</mark>'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            print('Hello world!', [
                { type: 'mark', start: 6, end: 11, data: null }
            ], printer);

            strictEqual(parts.length >= 5, true);
            strictEqual(parts.includes('Hello '), true);
            strictEqual(parts.includes('<mark>'), true);
            strictEqual(parts.includes('world'), true);
            strictEqual(parts.includes('</mark>'), true);
        });

        it('should work with DOM-like object assembly', () => {
            interface Node {
                type: string;
                children: Array<Node | string>;
            }

            const printer: Printer = {
                createRoot: (): Node => ({ type: 'root', children: [] }),
                append: (parent: Node, child: Node | string) => {
                    parent.children.push(child);
                    return parent;
                },
                finalize: (root: Node) => root,
                ranges: {
                    paragraph: {
                        node: ({ content }: PrinterHookContext) => {
                            const p: Node = { type: 'p', children: [] };
                            const contentNode = content();
                            if (contentNode.type === 'root') {
                                p.children = contentNode.children;
                            }
                            return p;
                        }
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('Hello world!', [
                { type: 'paragraph', start: 0, end: 12, data: null }
            ], printer) as Node;

            strictEqual(result.type, 'root');
            strictEqual(result.children.length, 1);
            strictEqual((result.children[0] as Node).type, 'p');
            strictEqual(
                JSON.stringify((result.children[0] as Node).children),
                JSON.stringify(['Hello world!'])
            );
        });

        it('should default to string concatenation when not provided', () => {
            const printer: Printer = {
                ranges: {
                    test: {
                        open: () => '<test>',
                        close: () => '</test>'
                    }
                },
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print(
                'content',
                [{ type: 'test', start: 0, end: 7, data: null }],
                printer
            );

            strictEqual(result, '<test>content</test>');
        });
    });

    describe('finalize', () => {
        it('should use finalize to process final output', () => {
            let finalizeCalled = false;
            const printer: Printer = {
                finalize: (buffer: string) => {
                    finalizeCalled = true;
                    return `FINAL[${buffer}]`;
                },
                ranges: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('test', [], printer);
            strictEqual(finalizeCalled, true);
            strictEqual(result, 'FINAL[test]');
        });

        it('should transform array buffer to string', () => {
            const printer: Printer = {
                createRoot: () => [],
                append: (parent: any[], child: any) => {
                    parent.push(child);
                    return parent;
                },
                finalize: (parts: any[]) => parts.join(''),
                ranges: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('Hello world!', [], printer);

            strictEqual(result, 'Hello world!');
        });

        it('should default to identity function when not provided', () => {
            const printer: Printer = {
                ranges: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('test', [], printer);
            strictEqual(result, 'test');
        });
    });

    describe('lifecycle methods order', () => {
        it('should call printer methods in correct order', () => {
            const calls: string[] = [];
            const printer: Printer = {
                createRoot: () => {
                    calls.push('createRoot');
                    return '';
                },
                before: () => {
                    calls.push('before');
                    return '<doc>';
                },
                append: (buffer: string, content: string) => {
                    calls.push(`append:${content.substring(0, Math.min(10, content.length))}`);
                    return buffer + content;
                },
                after: () => {
                    calls.push('after');
                    return '</doc>';
                },
                finalize: (buffer: string) => {
                    calls.push('finalize');
                    return buffer;
                },
                ranges: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            print('test', [], printer);

            strictEqual(calls[0], 'createRoot');
            strictEqual(calls.includes('before'), true);
            strictEqual(calls.includes('after'), true);
            strictEqual(calls[calls.length - 1], 'finalize');
        });
    });
});

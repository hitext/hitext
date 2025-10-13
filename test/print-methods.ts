import { strictEqual } from 'assert';
import { print } from '../src/index.js';
import type { Printer } from '../src/types.d.js';

describe('print methods', () => {
    describe('createBuffer', () => {
        it('should use createBuffer to initialize output buffer', () => {
            let rootCalled = false;
            const printer: Printer = {
                createBuffer: () => {
                    rootCalled = true;
                    return {
                        buffer: 'ROOT:',
                        append(child: string) {
                            this.buffer += child;
                        },
                        toString() {
                            return this.buffer;
                        }
                    };
                },
                hooks: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('test', [], printer);
            strictEqual(rootCalled, true);
            strictEqual(result, 'ROOT:test');
        });

        it('should default to empty string when not provided', () => {
            const printer: Printer = {
                hooks: {
                    test: {
                        before: () => '<test>',
                        after: () => '</test>'
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
                createBuffer: () => '',
                append: (buffer: string, content: string) => {
                    calls.push(`append(${JSON.stringify(content)})`);
                    return buffer + '[' + content + ']';
                },
                hooks: {
                    test: {
                        before: () => 'OPEN',
                        after: () => 'CLOSE'
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
                createBuffer: () => [],
                append: (parent: any[], child: any) => {
                    parts.push(child);
                    parent.push(child);
                    return parent;
                },
                hooks: {
                    mark: {
                        before: () => '<mark>',
                        after: () => '</mark>'
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
                createBuffer: (): Node => ({ type: 'root', children: [] }),
                append: (parent: Node, child: Node | string) => {
                    parent.children.push(child);
                    return parent;
                },
                emit: (root: Node) => root,
                hooks: {
                    paragraph: {
                        node: (content: any) => {
                            const p: Node = { type: 'p', children: [] };
                            if (content.type === 'root') {
                                p.children = content.children;
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
                hooks: {
                    test: {
                        before: () => '<test>',
                        after: () => '</test>'
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

    describe('emit', () => {
        it('should use emit to process final output', () => {
            let emitCalled = false;
            const printer: Printer = {
                emit: (buffer: any) => {
                    emitCalled = true;
                    return `FINAL[${buffer}]`;
                },
                hooks: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('test', [], printer);
            strictEqual(emitCalled, true);
            strictEqual(result, 'FINAL[test]');
        });

        it('should transform array buffer to string', () => {
            const printer: Printer = {
                createBuffer: () => [],
                append: (parent: any[], child: any) => {
                    parent.push(child);
                    return parent;
                },
                emit: (parts: any[]) => parts.join(''),
                hooks: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            const result = print('Hello world!', [], printer);

            strictEqual(result, 'Hello world!');
        });

        it('should default to identity function when not provided', () => {
            const printer: Printer = {
                hooks: {},
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
                createBuffer: () => {
                    calls.push('createBuffer');
                    return '';
                },
                open: () => {
                    calls.push('open');
                    return '<doc>';
                },
                append: (buffer: string, content: string) => {
                    calls.push(`append:${content.substring(0, Math.min(10, content.length))}`);
                    return buffer + content;
                },
                close: () => {
                    calls.push('close');
                    return '</doc>';
                },
                emit: (buffer: string) => {
                    calls.push('emit');
                    return buffer;
                },
                hooks: {},
                fork: () => printer,
                createHook: fn => fn()
            };

            print('test', [], printer);

            strictEqual(calls[0], 'createBuffer');
            strictEqual(calls.includes('open'), true);
            strictEqual(calls.includes('close'), true);
            strictEqual(calls[calls.length - 1], 'emit');
        });
    });
});

import { strictEqual } from 'assert';
import { parseHTML } from 'linkedom';
import { print, dom } from '../src/index.js';

const printers = { dom };

// Setup DOM environment for tests
const { document: doc } = parseHTML('<!DOCTYPE html><html></html>');

describe('DOM printer', () => {
    describe('basic functionality', () => {
        it('should create text nodes for plain text', () => {
            const result = print('Hello world!', [], printers.dom, { document: doc });

            strictEqual(result.toString(), '<#document-fragment>Hello world!</#document-fragment>');
        });

        it('should concatenate adjacent text chunks', () => {
            const result = print('Hello world!', [], printers.dom, { document: doc });

            // Should have only one text node, not multiple
            strictEqual(result.toString(), '<#document-fragment>Hello world!</#document-fragment>');
        });

        it('should work with empty string', () => {
            const result = print('', [], printers.dom, { document: doc });

            strictEqual(result.toString(), '<#document-fragment></#document-fragment>');
        });
    });

    describe('node hook', () => {
        it('should create element nodes using node hook', () => {
            const printer = printers.dom.fork({
                hooks: {
                    emphasis: {
                        node: (content) => {
                            const em = doc.createElement('em');
                            em.append(content);
                            return em;
                        }
                    }
                }
            });

            const result = print('Hello world!', [
                { type: 'emphasis', start: 6, end: 11, data: null }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(result.toString(), '<#document-fragment>Hello <em>world</em>!</#document-fragment>');
        });

        it('should support nested element nodes', () => {
            const printer = printers.dom.fork({
                hooks: {
                    paragraph: {
                        node: (content) => {
                            const p = doc.createElement('p');
                            p.append(content);
                            return p;
                        }
                    },
                    strong: {
                        node: (content) => {
                            const strong = doc.createElement('strong');
                            strong.append(content);
                            return strong;
                        }
                    }
                }
            });

            const result = print('Hello world!', [
                { type: 'paragraph', start: 0, end: 12, data: null },
                { type: 'strong', start: 6, end: 11, data: null }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(result.toString(), '<#document-fragment><p>Hello <strong>world</strong>!</p></#document-fragment>');
        });

        it('should support elements with attributes', () => {
            const printer = printers.dom.fork({
                hooks: {
                    link: {
                        node: (content, { data }) => {
                            const a = doc.createElement('a');
                            a.setAttribute('href', data.url);
                            a.setAttribute('target', '_blank');
                            a.append(content);
                            return a;
                        }
                    }
                }
            });

            const result = print('Click here', [
                { type: 'link', start: 6, end: 10, data: { url: 'https://example.com' } }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(result.toString(), '<#document-fragment>Click <a target="_blank" href="https://example.com">here</a></#document-fragment>');
        });

        it('should handle multiple non-overlapping elements', () => {
            const printer = printers.dom.fork({
                hooks: {
                    span: {
                        node: (content, { data }) => {
                            const span = doc.createElement('span');
                            span.setAttribute('class', data.className);
                            span.append(content);
                            return span;
                        }
                    }
                }
            });

            const result = print('One Two Three', [
                { type: 'span', start: 0, end: 3, data: { className: 'first' } },
                { type: 'span', start: 4, end: 7, data: { className: 'second' } },
                { type: 'span', start: 8, end: 13, data: { className: 'third' } }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(
                result.toString(),
                '<#document-fragment><span class="first">One</span> <span class="second">Two</span> <span class="third">Three</span></#document-fragment>'
            );
        });

        it('should support node hook with before/after hooks', () => {
            const printer = printers.dom.fork({
                hooks: {
                    wrapper: {
                        before: () => {
                            const prefix = doc.createElement('span');
                            prefix.className = 'prefix';
                            prefix.textContent = '[';
                            return prefix;
                        },
                        after: () => {
                            const suffix = doc.createElement('span');
                            suffix.className = 'suffix';
                            suffix.textContent = ']';
                            return suffix;
                        },
                        node: (content) => {
                            const div = doc.createElement('div');
                            div.className = 'wrapper';
                            div.append(content);
                            return div;
                        }
                    }
                }
            });

            const result = print('Hello world!', [
                { type: 'wrapper', start: 6, end: 11, data: null }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(
                result.toString(),
                '<#document-fragment>Hello <span class="prefix">[</span><div class="wrapper">world</div><span class="suffix">]</span>!</#document-fragment>'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty ranges', () => {
            const printer = printers.dom.fork({
                hooks: {
                    marker: {
                        node: (content) => {
                            const span = doc.createElement('span');
                            span.setAttribute('class', 'marker');
                            span.append(content);
                            return span;
                        }
                    }
                }
            });

            const result = print('Hello', [
                { type: 'marker', start: 2, end: 2, data: null }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(result.toString(), '<#document-fragment>He<span class="marker"></span>llo</#document-fragment>');
        });

        it('should handle deeply nested structures', () => {
            const printer = printers.dom.fork({
                hooks: {
                    div: {
                        node: (content, { data }) => {
                            const div = doc.createElement('div');
                            div.setAttribute('level', String(data.level));
                            div.append(content);
                            return div;
                        }
                    }
                }
            });

            const result = print('content', [
                { type: 'div', start: 0, end: 7, data: { level: 1 } },
                { type: 'div', start: 0, end: 7, data: { level: 2 } },
                { type: 'div', start: 0, end: 7, data: { level: 3 } }
            ], printer, { document: doc }) as globalThis.Node;

            strictEqual(
                result.toString(),
                '<#document-fragment><div level="1"><div level="2"><div level="3">content</div></div></div></#document-fragment>'
            );
        });

        it('should handle overlapping ranges', () => {
            const printer = printers.dom.fork({
                hooks: {
                    bold: {
                        node: (content) => {
                            const b = doc.createElement('b');
                            b.append(content);
                            return b;
                        }
                    },
                    italic: {
                        node: (content) => {
                            const i = doc.createElement('i');
                            i.append(content);
                            return i;
                        }
                    }
                }
            });

            const result = print('Hello world', [
                { type: 'bold', start: 0, end: 8, data: null },
                { type: 'italic', start: 3, end: 11, data: null }
            ], printer, { document: doc });

            strictEqual(
                result.toString(),
                '<#document-fragment><b>Hel</b><i><b>lo wo</b>rld</i></#document-fragment>'
            );
        });

        it('should handle text with special characters', () => {
            const result = print('<div>Hello & "world"</div>', [], printers.dom, { document: doc });

            // DOM printer doesn't escape - text is stored as-is in text nodes
            strictEqual(result.toString(), '<#document-fragment>&lt;div&gt;Hello &amp; "world"&lt;/div&gt;</#document-fragment>');
        });

        it('should handle ranges at boundaries', () => {
            const printer = printers.dom.fork({
                hooks: {
                    mark: {
                        node: (content) => {
                            const mark = doc.createElement('mark');
                            mark.append(content);
                            return mark;
                        }
                    }
                }
            });

            const result = print('test', [
                { type: 'mark', start: 0, end: 4, data: null }
            ], printer, { document: doc });

            strictEqual(result.toString(), '<#document-fragment><mark>test</mark></#document-fragment>');
        });

        it('should handle multiple adjacent ranges', () => {
            const printer = printers.dom.fork({
                hooks: {
                    span: {
                        node: (content, { data }) => {
                            const span = doc.createElement('span');
                            span.setAttribute('id', data.id);
                            span.append(content);
                            return span;
                        }
                    }
                }
            });

            const result = print('abc', [
                { type: 'span', start: 0, end: 1, data: { id: '1' } },
                { type: 'span', start: 1, end: 2, data: { id: '2' } },
                { type: 'span', start: 2, end: 3, data: { id: '3' } }
            ], printer, { document: doc });

            strictEqual(
                result.toString(),
                '<#document-fragment><span id="1">a</span><span id="2">b</span><span id="3">c</span></#document-fragment>'
            );
        });
    });

    describe('printer methods', () => {
        it('should support custom emit', () => {
            const printer = printers.dom.fork({
                emit: (root: globalThis.Node) => {
                    const div = doc.createElement('div');
                    div.setAttribute('class', 'wrapper');
                    div.append(root);
                    return div;
                },
                hooks: {
                    em: {
                        node: (content) => {
                            const em = doc.createElement('em');
                            em.append(content);
                            return em;
                        }
                    }
                }
            });

            const result = print('Hello', [
                { type: 'em', start: 0, end: 5, data: null }
            ], printer, { document: doc });

            strictEqual((result as globalThis.Element).outerHTML, '<div class="wrapper"><em>Hello</em></div>');
        });

        it('should support mixing node hooks with before/after hooks', () => {
            const printer = printers.dom.fork({
                hooks: {
                    wrapper: {
                        node: (content) => {
                            const div = doc.createElement('div');
                            div.append(content);
                            return div;
                        }
                    },
                    bracket: {
                        before: () => '[',
                        after: () => ']'
                    }
                }
            });

            const result = print('test', [
                { type: 'wrapper', start: 0, end: 4, data: null },
                { type: 'bracket', start: 1, end: 3, data: null }
            ], printer, { document: doc });

            strictEqual(result.toString(), '<#document-fragment><div>t[es]t</div></#document-fragment>');
        });
    });

    describe('error handling', () => {
        it('should throw error when document is not available', () => {
            // This should throw in a non-browser environment without a document
            let errorThrown = false;
            try {
                print('test', [], printers.dom); // No document option provided
            } catch (e: any) {
                errorThrown = true;
                strictEqual(e.message.includes('DOM printer requires a document object'), true);
            }

            strictEqual(errorThrown, true);
        });
    });

    describe('fork printer', () => {
        it('should support fork with no changes', () => {
            const forked = printers.dom.fork();
            const result = print('test', [], forked, { document: doc });
            strictEqual(result.toString(), '<#document-fragment>test</#document-fragment>');
        });

        it('should support fork with empty options', () => {
            const forked = printers.dom.fork({});
            const result = print('test', [], forked, { document: doc });
            strictEqual(result.toString(), '<#document-fragment>test</#document-fragment>');
        });

        it('should be extendable', () => {
            const basePrinter = printers.dom;
            const customPrinter = basePrinter.fork({
                hooks: {
                    highlight: {
                        node: (content) => {
                            const mark = doc.createElement('mark');
                            mark.append(content);
                            return mark;
                        }
                    }
                }
            });

            const baseResult = print('test', [
                { type: 'highlight', start: 0, end: 4, data: null }
            ], basePrinter, { document: doc });

            const customResult = print('test', [
                { type: 'highlight', start: 0, end: 4, data: null }
            ], customPrinter, { document: doc });

            strictEqual(baseResult.toString(), '<#document-fragment>test</#document-fragment>');
            strictEqual(customResult.toString(), '<#document-fragment><mark>test</mark></#document-fragment>');
            strictEqual(typeof customPrinter.fork, 'function');
        });
    });
});

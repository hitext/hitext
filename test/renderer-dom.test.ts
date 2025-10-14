import { strictEqual } from 'assert';
import { parseHTML } from 'linkedom';
import { dom } from '../src/index.js';
import type { RangeHookContext } from '../src/types.d.js';

// Setup DOM environment for tests
const { document: doc } = parseHTML('<!DOCTYPE html><html></html>');

describe('DOM renderer', () => {
    describe('basic functionality', () => {
        it('should create text nodes for plain text', () => {
            const result = dom({ document: doc }).render('Hello world!');

            strictEqual(result.toString(), '<#document-fragment>Hello world!</#document-fragment>');
        });

        it('should work with empty string', () => {
            const result = dom({ document: doc }).render('');

            strictEqual(result.toString(), '<#document-fragment></#document-fragment>');
        });
    });

    describe('node hook', () => {
        it('should create element nodes using node hook', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 6, end: 11 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const em = doc.createElement('em');
                        em.append(content);
                        return em;
                    }
                })
                .render('Hello world!');

            strictEqual(result.toString(), '<#document-fragment>Hello <em>world</em>!</#document-fragment>');
        });

        it('should support nested element nodes', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 0, end: 12 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const p = doc.createElement('p');
                        p.append(content);
                        return p;
                    }
                })
                .addLayer([
                    { start: 6, end: 11 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const strong = doc.createElement('strong');
                        strong.append(content);
                        return strong;
                    }
                })
                .render('Hello world!');

            strictEqual(result.toString(), '<#document-fragment><p>Hello <strong>world</strong>!</p></#document-fragment>');
        });

        it('should support elements with attributes from data', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 6, end: 10, data: { url: 'https://example.com' } }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment, { data }: RangeHookContext<{ url: string }>) => {
                        const a = doc.createElement('a');
                        a.setAttribute('href', data.url);
                        a.setAttribute('target', '_blank');
                        a.append(content);
                        return a;
                    }
                })
                .render('Click here');

            strictEqual(result.toString(), '<#document-fragment>Click <a target="_blank" href="https://example.com">here</a></#document-fragment>');
        });

        it('should handle multiple non-overlapping elements', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 0, end: 3, data: { className: 'first' } },
                    { start: 4, end: 7, data: { className: 'second' } },
                    { start: 8, end: 13, data: { className: 'third' } }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment, { data }: RangeHookContext<{ className: string }>) => {
                        const span = doc.createElement('span');
                        span.setAttribute('class', data.className);
                        span.append(content);
                        return span;
                    }
                })
                .render('One Two Three');

            strictEqual(
                result.toString(),
                '<#document-fragment><span class="first">One</span> <span class="second">Two</span> <span class="third">Three</span></#document-fragment>'
            );
        });

        it('should support node hook with open/close hooks', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 6, end: 11 }
                ], {
                    open: () => {
                        const prefix = doc.createElement('span');
                        prefix.className = 'prefix';
                        prefix.textContent = '[';
                        return prefix;
                    },
                    close: () => {
                        const suffix = doc.createElement('span');
                        suffix.className = 'suffix';
                        suffix.textContent = ']';
                        return suffix;
                    },
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const div = doc.createElement('div');
                        div.className = 'wrapper';
                        div.append(content);
                        return div;
                    }
                })
                .render('Hello world!');

            strictEqual(
                result.toString(),
                '<#document-fragment>Hello <span class="prefix">[</span><div class="wrapper">world</div><span class="suffix">]</span>!</#document-fragment>'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty ranges', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 2, end: 2 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const span = doc.createElement('span');
                        span.setAttribute('class', 'marker');
                        span.append(content);
                        return span;
                    }
                })
                .render('Hello');

            strictEqual(result.toString(), '<#document-fragment>He<span class="marker"></span>llo</#document-fragment>');
        });

        it('should handle deeply nested structures', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 0, end: 7, data: { level: 1 } },
                    { start: 0, end: 7, data: { level: 2 } },
                    { start: 0, end: 7, data: { level: 3 } }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment, { data }: RangeHookContext<{ level: number }>) => {
                        const div = doc.createElement('div');
                        div.setAttribute('level', String(data.level));
                        div.append(content);
                        return div;
                    }
                })
                .render('content');

            strictEqual(
                result.toString(),
                '<#document-fragment><div level="1"><div level="2"><div level="3">content</div></div></div></#document-fragment>'
            );
        });

        it('should handle overlapping ranges', () => {
            const pipeline = dom({ document: doc })
                .addLayer([
                    { start: 0, end: 8 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const b = doc.createElement('b');
                        b.append(content);
                        return b;
                    }
                })
                .addLayer([
                    { start: 3, end: 11 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const i = doc.createElement('i');
                        i.append(content);
                        return i;
                    }
                });

            const result = pipeline.render('Hello world');

            strictEqual(
                result.toString(),
                '<#document-fragment><b>Hel</b><i><b>lo wo</b>rld</i></#document-fragment>'
            );
        });

        it('should handle text with special characters', () => {
            const result = dom({ document: doc }).render('<div>Hello & "world"</div>');

            // DOM automatically escapes special characters in text nodes
            strictEqual(result.toString(), '<#document-fragment>&lt;div&gt;Hello &amp; "world"&lt;/div&gt;</#document-fragment>');
        });

        it('should handle ranges at boundaries', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 0, end: 4 }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment) => {
                        const mark = doc.createElement('mark');
                        mark.append(content);
                        return mark;
                    }
                })
                .render('test');

            strictEqual(result.toString(), '<#document-fragment><mark>test</mark></#document-fragment>');
        });

        it('should handle multiple adjacent ranges', () => {
            const result = dom({ document: doc })
                .addLayer([
                    { start: 0, end: 1, data: { id: '1' } },
                    { start: 1, end: 2, data: { id: '2' } },
                    { start: 2, end: 3, data: { id: '3' } }
                ], {
                    node: (content: globalThis.Node | globalThis.DocumentFragment, { data }: RangeHookContext<{ id: string }>) => {
                        const span = doc.createElement('span');
                        span.setAttribute('id', data.id);
                        span.append(content);
                        return span;
                    }
                })
                .render('abc');

            strictEqual(
                result.toString(),
                '<#document-fragment><span id="1">a</span><span id="2">b</span><span id="3">c</span></#document-fragment>'
            );
        });
    });
});

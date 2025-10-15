import assert from 'assert';
import { h, Fragment } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { jsx } from '../src/index.js';

describe('JSX renderer', () => {
    it('should render plain text', () => {
        const result = jsx().render('Hello, world!');
        const html = renderToString(h(Fragment, null, ...result));

        assert.strictEqual(html, 'Hello, world!');
    });

    it('should render with range hook', () => {
        const result = jsx()
            .addLayer([
                { start: 0, end: 5 }
            ], {
                range: (content: any) => h('span', { class: 'test' }, content)
            })
            .render('Hello, world!');
        const html = renderToString(h(Fragment, null, ...result));

        assert.strictEqual(html, '<span class="test">Hello</span>, world!');
    });

    it('should render nested ranges', () => {
        const result = jsx()
            .addLayer([
                { start: 0, end: 12 }
            ], {
                range: (content: any) => h('div', { class: 'outer' }, content)
            })
            .addLayer([
                { start: 0, end: 5 }
            ], {
                range: (content: any) => h('span', { class: 'inner' }, content)
            })
            .render('Hello, world!');
        const html = renderToString(h(Fragment, null, ...result));

        assert.strictEqual(html, '<div class="outer"><span class="inner">Hello</span>, world</div>!');
    });

    it('should pass data to hooks', () => {
        const result = jsx()
            .addLayer([
                { start: 0, end: 5, data: { color: 'red' } }
            ], {
                range: (content: any, { data }: any) => h('span', { style: `color: ${data.color}` }, content)
            })
            .render('Hello, world!');
        const html = renderToString(h(Fragment, null, ...result));

        assert.strictEqual(html, '<span style="color: red">Hello</span>, world!');
    });

    it('should return an array that can be used as JSX children', () => {
        const result = jsx()
            .addLayer([
                { start: 0, end: 5 }
            ], {
                range: (content: any) => h('span', { class: 'test' }, content)
            })
            .render('Hello, world!');

        // Result should be an array
        assert.ok(Array.isArray(result));

        // Should work as JSX children in a div
        const html = renderToString(h('div', null, ...result));
        assert.strictEqual(html, '<div><span class="test">Hello</span>, world!</div>');
    });

    it('should handle multiple ranges', () => {
        const result = jsx()
            .addLayer([
                { start: 0, end: 5 },
                { start: 7, end: 12 }
            ], {
                range: (content: any) => h('span', { class: 'test' }, content)
            })
            .render('Hello, world!');
        const html = renderToString(h(Fragment, null, ...result));

        assert.strictEqual(html, '<span class="test">Hello</span>, <span class="test">world</span>!');
    });
});

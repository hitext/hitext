import { equal } from 'assert';
import { html, string, rangeLines, rangeMatch } from '../src/index.js';

describe('Pipeline API', () => {
    describe('basic usage', () => {
        it('should render plain text without layers', () => {
            equal(
                html().render('Hi!'),
                'Hi!'
            );
        });

        it('should render with single layer', () => {
            const result = html()
                .addLayer(
                    [[0, 5]],
                    {
                        open: () => '<mark>',
                        close: () => '</mark>'
                    }
                )
                .render('Hello world!');

            equal(result, '<mark>Hello</mark> world!');
        });

        it('should render with multiple layers', () => {
            const result = html()
                .addLayer(
                    [[0, 5]],
                    {
                        open: () => '<strong>',
                        close: () => '</strong>'
                    }
                )
                .addLayer(
                    [[6, 11]],
                    {
                        open: () => '<em>',
                        close: () => '</em>'
                    }
                )
                .render('Hello world!');

            equal(result, '<strong>Hello</strong> <em>world</em>!');
        });

        it('should handle nested ranges', () => {
            const result = html()
                .addLayer(
                    [[0, 11]],
                    {
                        open: () => '<div>',
                        close: () => '</div>'
                    }
                )
                .addLayer(
                    [[0, 5]],
                    {
                        open: () => '<span>',
                        close: () => '</span>'
                    }
                )
                .render('Hello world');

            equal(result, '<div><span>Hello</span> world</div>');
        });

        it('should pass data to hooks', () => {
            const result = html()
                .addLayer<{ type: string }>(
                    [{ start: 0, end: 5, data: { type: 'greeting' } }],
                    {
                        open: ({ data }) => `<span class="${data.type}">`,
                        close: () => '</span>'
                    }
                )
                .render('Hello world');

            equal(result, '<span class="greeting">Hello</span> world');
        });

        it('should support node hooks', () => {
            const result = html()
                .addLayer<{ tag: string }>(
                    [{ start: 0, end: 5, data: { tag: 'custom' } }],
                    {
                        node: (content, { data }) => `<${data.tag}>${content}</${data.tag}>`
                    }
                )
                .render('Hello world');

            equal(result, '<custom>Hello</custom> world');
        });

        it('should handle array ranges', () => {
            const result = html()
                .addLayer(
                    [[0, 5], [6, 11]],
                    {
                        open: () => '<mark>',
                        close: () => '</mark>'
                    }
                )
                .render('Hello world');

            equal(result, '<mark>Hello</mark> <mark>world</mark>');
        });
    });

    describe('with generators', () => {
        it('should work with built-in match generator', () => {
            const result = html()
                .addLayer(
                    rangeMatch('world'),
                    {
                        open: () => '<mark>',
                        close: () => '</mark>'
                    }
                )
                .render('Hello world! Hello world!');

            equal(result, 'Hello <mark>world</mark>! Hello <mark>world</mark>!');
        });

        it('should work with built-in lines generator', () => {
            const result = html()
                .addLayer(
                    rangeLines,
                    {
                        open: ({ line }) => `<div data-line="${line}">`,
                        close: () => '</div>'
                    }
                )
                .render('line1\nline2\nline3');

            equal(result, '<div data-line="1">line1\n</div><div data-line="2">line2\n</div><div data-line="3">line3</div>');
        });
    });

    describe('renderer creation', () => {
        it('should create a pipeline', () => {
            const pipeline = html();
            equal(typeof pipeline.render, 'function');
            equal(typeof pipeline.addLayer, 'function');
        });

        it('should pass render options', () => {
            const result = string()
                .addLayer(
                    [[0, 5]],
                    {
                        open: () => '[',
                        close: () => ']'
                    }
                )
                .render('Hello world', { customOption: 'value' });

            equal(result, '[Hello] world');
        });
    });
});

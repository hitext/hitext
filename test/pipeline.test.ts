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

    describe('pipeline introspection', () => {
        it('should expose createRenderHooks property', () => {
            const pipeline = html();

            equal(typeof pipeline.createRenderHooks, 'function');

            const renderHooks = pipeline.createRenderHooks();
            equal(typeof renderHooks.createBuffer, 'function');
            equal(typeof renderHooks.text, 'function');
        });

        it('should expose layers property', () => {
            const pipeline = html()
                .addLayer([[0, 5]], { open: () => '<a>', close: () => '</a>' })
                .addLayer([[6, 11]], { open: () => '<b>', close: () => '</b>' });

            equal(Array.isArray(pipeline.layers), true);
            equal(pipeline.layers.length, 2);

            // Each layer should have marker, generate, and rangeHooks
            equal(typeof pipeline.layers[0].marker, 'symbol');
            equal(typeof pipeline.layers[0].generate, 'function');
            equal(typeof pipeline.layers[0].rangeHooks, 'object');
        });

        it('should generate ranges without rendering', () => {
            const pipeline = html()
                .addLayer([[0, 5]], { open: () => '<mark>', close: () => '</mark>' })
                .addLayer([[6, 11]], { open: () => '<em>', close: () => '</em>' });

            const ranges = pipeline.ranges('Hello world');

            equal(Array.isArray(ranges), true);
            equal(ranges.length, 2);
            equal(ranges[0].start, 0);
            equal(ranges[0].end, 5);
            equal(ranges[1].start, 6);
            equal(ranges[1].end, 11);
        });

        it('should generate ranges with generator function', () => {
            const pipeline = html()
                .addLayer(
                    rangeMatch('world'),
                    { open: () => '<mark>', close: () => '</mark>' }
                );

            const ranges = pipeline.ranges('Hello world! Hello world!');

            equal(ranges.length, 2);
            equal(ranges[0].start, 6);
            equal(ranges[0].end, 11);
            equal(ranges[1].start, 19);
            equal(ranges[1].end, 24);
        });

        it('should generate ranges from multiple layers', () => {
            const pipeline = html()
                .addLayer([[0, 5]], { open: () => '<a>', close: () => '</a>' })
                .addLayer(rangeMatch('o'), { open: () => '<mark>', close: () => '</mark>' });

            const ranges = pipeline.ranges('Hello world');

            // Should have ranges from both layers
            equal(ranges.length, 3); // [0,5] + two 'o' matches at 4 and 7

            // First layer range
            equal(ranges[0].start, 0);
            equal(ranges[0].end, 5);

            // Second layer ranges (matches)
            equal(ranges[1].start, 4);
            equal(ranges[1].end, 5);
            equal(ranges[2].start, 7);
            equal(ranges[2].end, 8);
        });

        it('should expose rangeHooksMap method', () => {
            const pipeline = html()
                .addLayer([[0, 5]], {
                    open: () => '<mark>',
                    close: () => '</mark>'
                });

            const hooksMap = pipeline.rangeHooksMap();

            equal(typeof hooksMap, 'object');

            // Should have one entry (the symbol key)
            const keys = Object.getOwnPropertySymbols(hooksMap);
            equal(keys.length, 1);

            // The hooks should be present
            const hooks = hooksMap[keys[0]];
            equal(typeof hooks.open, 'function');
            equal(typeof hooks.close, 'function');
        });

        it('rangeHooksMap should resolve function-based hooks', () => {
            const pipeline = html()
                .addLayer([[0, 5]], () => ({
                    open: () => '<dynamic>',
                    close: () => '</dynamic>'
                }));

            const hooksMap = pipeline.rangeHooksMap();
            const keys = Object.getOwnPropertySymbols(hooksMap);
            const hooks = hooksMap[keys[0]];

            // Should be resolved to actual hooks object
            equal(typeof hooks.open, 'function');
            equal(typeof hooks.close, 'function');
        });

        it('should support chaining after introspection', () => {
            const pipeline1 = html()
                .addLayer([[0, 5]], { open: () => '<a>', close: () => '</a>' });

            // Get introspection data
            const layers1 = pipeline1.layers;
            pipeline1.rangeHooksMap(); // Exercise the method

            // Continue building pipeline
            const pipeline2 = pipeline1
                .addLayer([[6, 11]], { open: () => '<b>', close: () => '</b>' });

            equal(layers1.length, 1);
            equal(pipeline2.layers.length, 2);

            const result = pipeline2.render('Hello world');
            equal(result, '<a>Hello</a> <b>world</b>');
        });
    });
});

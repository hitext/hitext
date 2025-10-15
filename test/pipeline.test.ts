import { strictEqual, deepStrictEqual } from 'assert';
import { html, string, rangeLines, rangeMatch, createRenderPipeline, RangeHooks } from '../src/index.js';
import type { GeneratedRange } from '../src/types.js';

const startEndPairs = (ranges: GeneratedRange[]) => ranges.map(r => [r.start, r.end]);

describe('Pipeline API', () => {
    describe('basic usage', () => {
        it('should render plain text without layers', () => {
            strictEqual(
                html().render('Hi!'),
                'Hi!'
            );
        });

        it('should render with single layer', () => {
            const result = html()
                .addLayer([[0, 5]], (content) => `<mark>${content}</mark>`)
                .render('Hello world!');

            strictEqual(result, '<mark>Hello</mark> world!');
        });

        it('should render with multiple layers', () => {
            const result = html()
                .addLayer([[0, 5]], (content) => `<strong>${content}</strong>`)
                .addLayer([[6, 11]], (content) => `<em>${content}</em>`)
                .render('Hello world!');

            strictEqual(result, '<strong>Hello</strong> <em>world</em>!');
        });

        it('should handle nested ranges', () => {
            const result = html()
                .addLayer([[0, 11]], (content) => `<div>${content}</div>`)
                .addLayer([[0, 5]], (content) => `<span>${content}</span>`)
                .render('Hello world');

            strictEqual(result, '<div><span>Hello</span> world</div>');
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

            strictEqual(result, '<span class="greeting">Hello</span> world');
        });

        it('should support node hooks', () => {
            const result = html()
                .addLayer<{ tag: string }>(
                    [{ start: 0, end: 5, data: { tag: 'custom' } }],
                    (content, { data }) => `<${data.tag}>${content}</${data.tag}>`
                )
                .render('Hello world');

            strictEqual(result, '<custom>Hello</custom> world');
        });

        it('should handle array ranges', () => {
            const result = html()
                .addLayer([[0, 5], [6, 11]], (content) => `<mark>${content}</mark>`)
                .render('Hello world');

            strictEqual(result, '<mark>Hello</mark> <mark>world</mark>');
        });
    });

    describe('with generators', () => {
        it('should work with built-in match generator', () => {
            const result = html()
                .addLayer(rangeMatch('world'), (content) => `<mark>${content}</mark>`)
                .render('Hello world! Hello world!');

            strictEqual(result, 'Hello <mark>world</mark>! Hello <mark>world</mark>!');
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

            strictEqual(result, '<div data-line="1">line1\n</div><div data-line="2">line2\n</div><div data-line="3">line3</div>');
        });
    });

    describe('renderer creation', () => {
        it('should create a pipeline', () => {
            const pipeline = html();
            strictEqual(typeof pipeline.render, 'function');
            strictEqual(typeof pipeline.addLayer, 'function');
        });

        it('should pass render options', () => {
            const result = string()
                .addLayer([[0, 5]], (content) => `[${content}]`)
                .render('Hello world', { customOption: 'value' });

            strictEqual(result, '[Hello] world');
        });
    });

    describe('pipeline introspection', () => {
        it('should expose createRenderHooks property', () => {
            const pipeline = html();

            strictEqual(typeof pipeline.createRenderHooks, 'function');

            const renderHooks = pipeline.createRenderHooks();
            strictEqual(typeof renderHooks.text, 'function');
        });

        it('should expose layers property', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `<a>${content}</a>`)
                .addLayer([[6, 11]], (content) => `<b>${content}</b>`);

            strictEqual(Array.isArray(pipeline.layers), true);
            strictEqual(pipeline.layers.length, 2);

            // Each layer should have marker, generate, and rangeHooksConfig
            const firstLayer = pipeline.layers[0];
            strictEqual(typeof firstLayer.marker, 'symbol');
            strictEqual(Array.isArray(firstLayer.ranges), true);
            strictEqual(typeof firstLayer.rangeHooks, 'function');
        });

        it('should generate ranges without rendering', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `<mark>${content}</mark>`)
                .addLayer([[6, 11]], (content) => `<em>${content}</em>`);

            const ranges = pipeline.ranges('Hello world');

            deepStrictEqual(startEndPairs(ranges), [[0, 5], [6, 11]]);
        });

        it('should generate ranges with generator function', () => {
            const pipeline = html()
                .addLayer(rangeMatch('world'), (content) => `<mark>${content}</mark>`);

            const ranges = pipeline.ranges('Hello world! Hello world!');

            deepStrictEqual(startEndPairs(ranges), [[6, 11], [19, 24]]);
        });

        it('should generate ranges from multiple layers', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `<a>${content}</a>`)
                .addLayer(rangeMatch('o'), (content) => `<mark>${content}</mark>`);

            const ranges = pipeline.ranges('Hello world');

            // Should have ranges from both layers: [0,5] + two 'o' matches at 4 and 7
            deepStrictEqual(startEndPairs(ranges), [[0, 5], [4, 5], [7, 8]]);
        });

        it('should expose rangeHooksMap method', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `<mark>${content}</mark>`);

            const hooksMap = pipeline.rangeHooksMap();

            strictEqual(typeof hooksMap, 'object');

            // Should have one entry (the symbol key)
            const keys = Object.getOwnPropertySymbols(hooksMap);
            strictEqual(keys.length, 1);

            // The hooks should be present
            const firstKey: keyof typeof hooksMap = keys[0];
            const hooks = hooksMap[firstKey];
            strictEqual(typeof hooks.content, 'function');
        });

        it('should expose rangeHooksDefinitionMap method', () => {
            const shortcut = (content: any) => `[${content}]`;
            const pipeline = html()
                .addLayer([[0, 5]], shortcut)
                .addLayer([[6, 11]], shortcut);

            const definitionMap = pipeline.rangeHooksDefinitionMap();

            strictEqual(typeof definitionMap, 'object');

            const keys = Object.getOwnPropertySymbols(definitionMap);
            strictEqual(keys.length, 2);

            // Both should be the function shortcut (unresolved)
            strictEqual(definitionMap[keys[0]], shortcut);
            strictEqual(definitionMap[keys[1]], shortcut);
        });

        it('rangeHooksMap should resolve factory-based hooks', () => {
            const pipeline = html()
                .addLayer([[0, 5]], {
                    createRangeHooks: () => ({
                        open: () => '<dynamic>',
                        close: () => '</dynamic>'
                    })
                });

            const hooksMap = pipeline.rangeHooksMap();
            const keys = Object.getOwnPropertySymbols(hooksMap);
            const firstKey: keyof typeof hooksMap = keys[0];
            const hooks = hooksMap[firstKey] as RangeHooks<any, any>;

            // Should be resolved to actual hooks object
            strictEqual(typeof hooks.open, 'function');
            strictEqual(typeof hooks.close, 'function');
        });

        it('rangeHooksMap should convert function shortcuts to range hook', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `[${content}]`);

            const hooksMap = pipeline.rangeHooksMap();
            const keys = Object.getOwnPropertySymbols(hooksMap);
            const firstKey: keyof typeof hooksMap = keys[0];
            const rangeHooks = hooksMap[firstKey];

            // Function shortcut should be converted to {content: fn}
            strictEqual(typeof rangeHooks?.content, 'function');
            strictEqual(rangeHooks?.content('test', {} as any), '[test]');
        });

        it('should test factory logic with rangeHooksContext', () => {
            // Create a custom renderer with context
            const customRenderer = html();

            // Create a factory that uses context
            const factoryConfig = {
                createRangeHooks: () => ({
                    open: () => '<mark>',
                    close: () => '</mark>'
                })
            };

            const pipeline = customRenderer.addLayer([[0, 5]], factoryConfig);
            const result = pipeline.render('Hello world');

            strictEqual(result, '<mark>Hello</mark> world');
        });

        it('should test all three hook config forms', () => {
            // 1. Plain object
            const pipeline1 = html()
                .addLayer([[0, 5]], {
                    open: () => '<a>',
                    close: () => '</a>'
                });
            strictEqual(pipeline1.render('Hello world'), '<a>Hello</a> world');

            // 2. Function shortcut
            const pipeline2 = html()
                .addLayer([[0, 5]], (content) => `<b>${content}</b>`);
            strictEqual(pipeline2.render('Hello world'), '<b>Hello</b> world');

            // 3. Factory wrapper
            const pipeline3 = html()
                .addLayer([[0, 5]], {
                    createRangeHooks: () => ({
                        open: () => '<c>',
                        close: () => '</c>'
                    })
                });
            strictEqual(pipeline3.render('Hello world'), '<c>Hello</c> world');
        });

        it('should support chaining after introspection', () => {
            const pipeline1 = html()
                .addLayer([[0, 5]], (content) => `<a>${content}</a>`);

            // Get introspection data
            const layers1 = pipeline1.layers;
            pipeline1.rangeHooksMap(); // Exercise the method

            // Continue building pipeline
            const pipeline2 = pipeline1
                .addLayer([[6, 11]], (content) => `<b>${content}</b>`);

            strictEqual(layers1.length, 1);
            strictEqual(pipeline2.layers.length, 2);

            const result = pipeline2.render('Hello world');
            strictEqual(result, '<a>Hello</a> <b>world</b>');
        });
    });

    describe('createRenderPipeline', () => {
        it('should create a custom renderer', () => {
            const customRenderer = createRenderPipeline(() => {
                let buffer = '';

                return {
                    createBuffer: () => ({
                        append(child: string) {
                            buffer += child;
                        },
                        emit() {
                            const result = buffer;
                            buffer = '';
                            return result;
                        }
                    }),
                    text: (chunk) => chunk,
                    open: () => '',
                    close: () => ''
                };
            });

            const result = customRenderer
                .addLayer([[0, 5]], {
                    open: () => '[',
                    close: () => ']'
                })
                .render('Hello world');

            strictEqual(result, '[Hello] world');
        });

        it('should support rangeHooksContext', () => {
            const customRenderer = createRenderPipeline<unknown, string, string, { wrapper: string }>(() => {
                let buffer = '';

                return {
                    createBuffer: () => ({
                        append(child: string) {
                            buffer += child;
                        },
                        emit() {
                            const result = buffer;
                            buffer = '';
                            return result;
                        }
                    }),
                    text: (chunk) => chunk,
                    open: () => '',
                    close: () => '',
                    rangeHooksContext: {
                        wrapper: '<<>>'
                    }
                };
            });

            const result = customRenderer
                .addLayer([[0, 5]], {
                    createRangeHooks: ({ wrapper }) => ({
                        open: () => wrapper.slice(0, 2),
                        close: () => wrapper.slice(2)
                    })
                })
                .render('Hello world');

            strictEqual(result, '<<Hello>> world');
        });

        it('should work with all hook config forms', () => {
            const customRenderer = createRenderPipeline(() => {
                let buffer = '';

                return {
                    createBuffer: () => ({
                        append(child: string) {
                            buffer += child;
                        },
                        emit() {
                            const result = buffer;
                            buffer = '';
                            return result;
                        }
                    }),
                    text: (chunk) => chunk,
                    open: () => '',
                    close: () => ''
                };
            });

            // Plain object
            strictEqual(
                customRenderer.addLayer([[0, 5]], { open: () => '<a>', close: () => '</a>' }).render('Hello world'),
                '<a>Hello</a> world'
            );

            // Function shortcut
            strictEqual(
                customRenderer.addLayer([[0, 5]], (content) => `<b>${content}</b>`).render('Hello world'),
                '<b>Hello</b> world'
            );

            // Factory wrapper
            strictEqual(
                customRenderer.addLayer([[0, 5]], {
                    createRangeHooks: () => ({ open: () => '<c>', close: () => '</c>' })
                }).render('Hello world'),
                '<c>Hello</c> world'
            );
        });
    });
});

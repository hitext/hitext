import { strictEqual, deepStrictEqual } from 'assert';
import type { SpanHooks, SpanHooksDefinition } from '../src/types.js';
import {
    createSpanHooksDefinitionMapFromLayers,
    resolveSpanHooksMap,
    resolveSpanHooksDefinition,
    html
} from '../src/index.js';

describe('Span Hooks Map Helpers', () => {
    describe('createSpanHooksDefinitionMapFromLayers', () => {
        it('should create a map from layers', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const spanHooks1 = (content: string) => `<div>${content}</div>`;
            const spanHooks2 = (content: string) => `<span>${content}</span>`;
            const map = createSpanHooksDefinitionMapFromLayers([
                {
                    marker: marker1,
                    spans: [[0, 5]],
                    spanHooks: spanHooks1
                },
                {
                    marker: marker2,
                    spans: [[6, 11]],
                    spanHooks: spanHooks2
                }
            ]);

            deepStrictEqual(map, {
                [marker1]: spanHooks1,
                [marker2]: spanHooks2
            });
        });

        it('should handle missing spanHooks', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const spanHooks2 = (content: string) => `<c>${content}</c>`;
            const map = createSpanHooksDefinitionMapFromLayers([
                {
                    marker: marker1,
                    spans: [[0, 5]]
                },
                {
                    marker: marker2,
                    spans: [[6, 11]],
                    spanHooks: spanHooks2
                }
            ]);

            deepStrictEqual(map, {
                [marker1]: undefined,
                [marker2]: spanHooks2
            });
        });

        it('should preserve function shortcuts', () => {
            const marker = Symbol('layer');
            const shortcut = (content: string) => `[${content}]`;
            const map = createSpanHooksDefinitionMapFromLayers([
                {
                    marker,
                    spans: [[0, 5]],
                    spanHooks: shortcut
                }
            ]);

            deepStrictEqual(map, {
                [marker]: shortcut
            });
        });
    });

    describe('resolveSpanHooksDefinition', () => {
        it('should return null for null/undefined', () => {
            strictEqual(resolveSpanHooksDefinition(null, {}), null);
            strictEqual(resolveSpanHooksDefinition(undefined, {}), null);
        });

        it('should convert function shortcut to wrap hook', () => {
            const shortcut = (content: string) => `[${content}]`;
            const resolved = resolveSpanHooksDefinition(shortcut, {});

            deepStrictEqual(resolved, {
                open: null,
                close: null,
                wrap: shortcut,
                text: null,
                replace: null,
                break: false
            });
        });

        it('should pass through plain hook objects', () => {
            const hooks = {
                open: () => '<mark>',
                close: () => '</mark>'
            };
            const resolved = resolveSpanHooksDefinition(hooks, {});

            deepStrictEqual(resolved, {
                open: hooks.open,
                close: hooks.close,
                wrap: null,
                text: null,
                replace: null,
                break: false
            });
        });

        it('should resolve factory definitions', () => {
            let hooks: Partial<SpanHooks<any, any, any>> | undefined;
            const factory: SpanHooksDefinition<any, any, any, { prefix: string }> = {
                createSpanHooks: ({ prefix }) => (hooks = {
                    open: () => `<${prefix}>`,
                    close: () => `</${prefix}>`
                })
            };

            const resolved = resolveSpanHooksDefinition(factory, {
                spanHooksContext: { prefix: 'custom' }
            });

            deepStrictEqual(resolved, {
                open: hooks?.open,
                close: hooks?.close,
                wrap: null,
                text: null,
                replace: null,
                break: false
            });

            strictEqual(resolved?.open?.({} as any), '<custom>');
            strictEqual(resolved?.close?.({} as any), '</custom>');
        });

        it('should handle factory returning function shortcut', () => {
            const factory: SpanHooksDefinition<any, any, any, { wrapper: string }> = {
                createSpanHooks: ({ wrapper }) => (content) => `${wrapper}${content}${wrapper}`
            };

            const resolved = resolveSpanHooksDefinition(factory, {
                spanHooksContext: { wrapper: '**' }
            });

            strictEqual(typeof resolved?.wrap, 'function');
            strictEqual(resolved?.wrap?.('test', {} as any), '**test**');
        });
    });

    describe('resolveSpanHooksMap', () => {
        it('should resolve all definitions in map', () => {
            const marker1 = Symbol('plain');
            const marker2 = Symbol('shortcut');
            const marker3 = Symbol('factory');
            const marker1hooks = {
                open: () => '<a>',
                close: () => '</a>'
            };
            const marker2hooks = (content: string) => `[${content}]`;
            const marker3hooks = {
                open: () => '<b>',
                close: () => '</b>',
                text: (chunk: string) => chunk.toUpperCase()
            };

            const definitionMap = {
                [marker1]: marker1hooks,
                [marker2]: marker2hooks,
                [marker3]: {
                    createSpanHooks: () => marker3hooks
                }
            };

            const resolved = resolveSpanHooksMap(definitionMap, {});

            deepStrictEqual(resolved, Object.assign(Object.create(null), {
                [marker1]: {
                    open: marker1hooks.open,
                    close: marker1hooks.close,
                    wrap: null,
                    text: null,
                    replace: null,
                    break: false
                },
                [marker2]: {
                    open: null,
                    close: null,
                    wrap: marker2hooks,
                    text: null,
                    replace: null,
                    break: false
                },
                [marker3]: {
                    open: marker3hooks.open,
                    close: marker3hooks.close,
                    wrap: null,
                    text: marker3hooks.text,
                    replace: null,
                    break: false
                }
            }));
        });

        it('should skip null/undefined definitions', () => {
            const shortcut = (content: string) => `<a>${content}</a>`;
            const marker1 = Symbol('valid');
            const marker2 = Symbol('empty');
            const marker3 = Symbol('null');
            const marker4 = Symbol('undefined');

            const definitionMap = {
                [marker1]: shortcut,
                [marker2]: {},
                [marker3]: null,
                [marker4]: undefined
            };

            const resolved = resolveSpanHooksMap(definitionMap, {});

            // Only valid definition should be present
            deepStrictEqual(resolved, Object.assign(Object.create(null), {
                [marker1]: {
                    open: null,
                    close: null,
                    wrap: shortcut,
                    text: null,
                    replace: null,
                    break: false
                },
                [marker2]: {
                    open: null,
                    close: null,
                    wrap: null,
                    text: null,
                    replace: null,
                    break: false
                }
            }));
        });

        it('should pass spanHooksContext to factories', () => {
            const marker = Symbol('factory');
            let capturedContext: any;

            const definitionMap = {
                [marker]: {
                    createSpanHooks: (context: any) => {
                        capturedContext = context;
                        return { open: () => '<tag>', close: () => '</tag>' };
                    }
                }
            };

            const testContext = { custom: 'value' };
            resolveSpanHooksMap(definitionMap, {
                spanHooksContext: testContext
            });

            strictEqual(capturedContext, testContext);
        });
    });

    describe('integration with pipeline', () => {
        it('should expose spanHooksDefinitionMap method', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `<a>${content}</a>`)
                .addLayer([[6, 11]], (content) => `<b>${content}</b>`);

            const definitionMap = pipeline.spanHooksDefinitionMap();

            strictEqual(typeof definitionMap, 'object');
            const keys = Object.getOwnPropertySymbols(definitionMap);
            strictEqual(keys.length, 2);

            // First should be the plain hooks object
            strictEqual(typeof definitionMap[keys[0]], 'function');

            // Second should be the function shortcut
            strictEqual(typeof definitionMap[keys[1]], 'function');
        });

        it('should differentiate between definitions and resolved hooks', () => {
            const factory = {
                createSpanHooks: () => ({
                    open: () => '<tag>',
                    close: () => '</tag>'
                })
            };

            const pipeline = html()
                .addLayer([[0, 5]], factory);

            // spanHooksDefinitionMap should return the factory
            const definitionMap = pipeline.spanHooksDefinitionMap();
            const defKeys = Object.getOwnPropertySymbols(definitionMap);
            strictEqual(definitionMap[defKeys[0]], factory);

            // spanHooksMap should return resolved hooks
            const hooksMap = pipeline.spanHooksMap();
            const hooksKeys = Object.getOwnPropertySymbols(hooksMap);
            strictEqual(typeof hooksMap[hooksKeys[0]]?.open, 'function');
            strictEqual(typeof hooksMap[hooksKeys[0]]?.close, 'function');
        });
    });
});

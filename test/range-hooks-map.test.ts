import { strictEqual, deepStrictEqual } from 'assert';
import type { RangeHooks, RangeHooksDefinition } from '../src/types.js';
import {
    createRangeHooksMapFromLayers,
    resolveRangeHooksMap,
    resolveRangeHooksDefinition,
    html
} from '../src/index.js';

describe('Range Hooks Map Helpers', () => {
    describe('createRangeHooksMapFromLayers', () => {
        it('should create a map from layers', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const rangeHooks1 = (content: string) => `<div>${content}</div>`;
            const rangeHooks2 = (content: string) => `<span>${content}</span>`;
            const map = createRangeHooksMapFromLayers([
                {
                    marker: marker1,
                    ranges: [[0, 5]],
                    rangeHooks: rangeHooks1
                },
                {
                    marker: marker2,
                    ranges: [[6, 11]],
                    rangeHooks: rangeHooks2
                }
            ]);

            deepStrictEqual(map, {
                [marker1]: rangeHooks1,
                [marker2]: rangeHooks2
            });
        });

        it('should handle missing rangeHooks', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const rangeHooks2 = (content: string) => `<c>${content}</c>`;
            const map = createRangeHooksMapFromLayers([
                {
                    marker: marker1,
                    ranges: [[0, 5]]
                },
                {
                    marker: marker2,
                    ranges: [[6, 11]],
                    rangeHooks: rangeHooks2
                }
            ]);

            deepStrictEqual(map, {
                [marker1]: undefined,
                [marker2]: rangeHooks2
            });
        });

        it('should preserve function shortcuts', () => {
            const marker = Symbol('layer');
            const shortcut = (content: string) => `[${content}]`;
            const map = createRangeHooksMapFromLayers([
                {
                    marker,
                    ranges: [[0, 5]],
                    rangeHooks: shortcut
                }
            ]);

            deepStrictEqual(map, {
                [marker]: shortcut
            });
        });
    });

    describe('resolveRangeHooksDefinition', () => {
        it('should return null for null/undefined', () => {
            strictEqual(resolveRangeHooksDefinition(null, {}), null);
            strictEqual(resolveRangeHooksDefinition(undefined, {}), null);
        });

        it('should convert function shortcut to content hook', () => {
            const shortcut = (content: string) => `[${content}]`;
            const resolved = resolveRangeHooksDefinition(shortcut, {});

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
            const resolved = resolveRangeHooksDefinition(hooks, {});

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
            let hooks: Partial<RangeHooks<any, any, any>> | undefined;
            const factory: RangeHooksDefinition<any, any, any, { prefix: string }> = {
                createRangeHooks: ({ prefix }) => (hooks = {
                    open: () => `<${prefix}>`,
                    close: () => `</${prefix}>`
                })
            };

            const resolved = resolveRangeHooksDefinition(factory, {
                rangeHooksContext: { prefix: 'custom' }
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
            const factory: RangeHooksDefinition<any, any, any, { wrapper: string }> = {
                createRangeHooks: ({ wrapper }) => (content) => `${wrapper}${content}${wrapper}`
            };

            const resolved = resolveRangeHooksDefinition(factory, {
                rangeHooksContext: { wrapper: '**' }
            });

            strictEqual(typeof resolved?.wrap, 'function');
            strictEqual(resolved?.wrap?.('test', {} as any), '**test**');
        });
    });

    describe('resolveRangeHooksMap', () => {
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
                    createRangeHooks: () => marker3hooks
                }
            };

            const resolved = resolveRangeHooksMap(definitionMap, {});

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

            const resolved = resolveRangeHooksMap(definitionMap, {});

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

        it('should pass rangeHooksContext to factories', () => {
            const marker = Symbol('factory');
            let capturedContext: any;

            const definitionMap = {
                [marker]: {
                    createRangeHooks: (context: any) => {
                        capturedContext = context;
                        return { open: () => '<tag>', close: () => '</tag>' };
                    }
                }
            };

            const testContext = { custom: 'value' };
            resolveRangeHooksMap(definitionMap, {
                rangeHooksContext: testContext
            });

            strictEqual(capturedContext, testContext);
        });
    });

    describe('integration with pipeline', () => {
        it('should expose rangeHooksDefinitionMap method', () => {
            const pipeline = html()
                .addLayer([[0, 5]], (content) => `<a>${content}</a>`)
                .addLayer([[6, 11]], (content) => `<b>${content}</b>`);

            const definitionMap = pipeline.rangeHooksDefinitionMap();

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
                createRangeHooks: () => ({
                    open: () => '<tag>',
                    close: () => '</tag>'
                })
            };

            const pipeline = html()
                .addLayer([[0, 5]], factory);

            // rangeHooksDefinitionMap should return the factory
            const definitionMap = pipeline.rangeHooksDefinitionMap();
            const defKeys = Object.getOwnPropertySymbols(definitionMap);
            strictEqual(definitionMap[defKeys[0]], factory);

            // rangeHooksMap should return resolved hooks
            const hooksMap = pipeline.rangeHooksMap();
            const hooksKeys = Object.getOwnPropertySymbols(hooksMap);
            strictEqual(typeof hooksMap[hooksKeys[0]]?.open, 'function');
            strictEqual(typeof hooksMap[hooksKeys[0]]?.close, 'function');
        });
    });
});

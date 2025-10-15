import { equal } from 'assert';
import {
    createRangeHooksMapFromLayers,
    resolveRangeHooksMap,
    resolveRangeHooksDefinition,
    html
} from '../src/index.js';
import type { PipelineLayer, RangeHooksDefinition } from '../src/types.d.js';

describe('Range Hooks Map Helpers', () => {
    describe('createRangeHooksMapFromLayers', () => {
        it('should create a map from layers', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');

            const layers: PipelineLayer<any, any, any, any, any>[] = [
                {
                    marker: marker1,
                    ranges: [[0, 5]],
                    rangeHooks: {
                        open: () => '<a>',
                        close: () => '</a>'
                    }
                },
                {
                    marker: marker2,
                    ranges: [[6, 11]],
                    rangeHooks: {
                        open: () => '<b>',
                        close: () => '</b>'
                    }
                }
            ];

            const map = createRangeHooksMapFromLayers(layers);

            equal(typeof map, 'object');
            equal(Object.getOwnPropertySymbols(map).length, 2);
            equal(map[marker1], layers[0].rangeHooks);
            equal(map[marker2], layers[1].rangeHooks);
        });

        it('should handle null and undefined rangeHooks', () => {
            const marker1 = Symbol('layer1');
            const marker2 = Symbol('layer2');
            const marker3 = Symbol('layer3');

            const layers: PipelineLayer<any, any, any, any, any>[] = [
                {
                    marker: marker1,
                    ranges: [[0, 5]],
                    rangeHooks: null
                },
                {
                    marker: marker2,
                    ranges: [[6, 11]],
                    rangeHooks: undefined
                },
                {
                    marker: marker3,
                    ranges: [[12, 17]],
                    rangeHooks: { open: () => '<c>', close: () => '</c>' }
                }
            ];

            const map = createRangeHooksMapFromLayers(layers);

            equal(map[marker1], null);
            equal(map[marker2], undefined);
            equal(typeof map[marker3], 'object');
        });

        it('should preserve function shortcuts', () => {
            const marker = Symbol('layer');
            const shortcut = (content: string) => `[${content}]`;

            const layers: PipelineLayer<any, any, any, any, any>[] = [
                {
                    marker,
                    ranges: [[0, 5]],
                    rangeHooks: shortcut
                }
            ];

            const map = createRangeHooksMapFromLayers(layers);
            equal(map[marker], shortcut);
        });
    });

    describe('resolveRangeHooksDefinition', () => {
        it('should return null for null/undefined', () => {
            equal(resolveRangeHooksDefinition(null, {}), null);
            equal(resolveRangeHooksDefinition(undefined, {}), null);
        });

        it('should convert function shortcut to content hook', () => {
            const shortcut = (content: string) => `[${content}]`;
            const resolved = resolveRangeHooksDefinition(shortcut, {});

            equal(typeof resolved, 'object');
            equal(resolved?.content, shortcut);
        });

        it('should pass through plain hook objects', () => {
            const hooks = {
                open: () => '<mark>',
                close: () => '</mark>'
            };

            const resolved = resolveRangeHooksDefinition(hooks, {});
            equal(resolved, hooks);
        });

        it('should resolve factory definitions', () => {
            const factory: RangeHooksDefinition<any, any, any, { prefix: string }> = {
                createRangeHooks: ({ prefix }) => ({
                    open: () => `<${prefix}>`,
                    close: () => `</${prefix}>`
                })
            };

            const resolved = resolveRangeHooksDefinition(factory, {
                rangeHooksContext: { prefix: 'custom' }
            });

            equal(typeof resolved, 'object');
            equal(typeof resolved?.open, 'function');
            equal(typeof resolved?.close, 'function');
            equal(resolved?.open?.({} as any), '<custom>');
            equal(resolved?.close?.({} as any), '</custom>');
        });

        it('should handle factory returning function shortcut', () => {
            const factory: RangeHooksDefinition<any, any, any, { wrapper: string }> = {
                createRangeHooks: ({ wrapper }) => (content) => `${wrapper}${content}${wrapper}`
            };

            const resolved = resolveRangeHooksDefinition(factory, {
                rangeHooksContext: { wrapper: '**' }
            });

            equal(typeof resolved?.content, 'function');
            equal(resolved?.content?.('test', {} as any), '**test**');
        });
    });

    describe('resolveRangeHooksMap', () => {
        it('should resolve all definitions in map', () => {
            const marker1 = Symbol('plain');
            const marker2 = Symbol('shortcut');
            const marker3 = Symbol('factory');

            const definitionMap = {
                [marker1]: {
                    open: () => '<a>',
                    close: () => '</a>'
                },
                [marker2]: (content: string) => `[${content}]`,
                [marker3]: {
                    createRangeHooks: () => ({
                        open: () => '<b>',
                        close: () => '</b>'
                    })
                }
            };

            const resolved = resolveRangeHooksMap(definitionMap, {});

            // All three should be resolved
            equal(Object.getOwnPropertySymbols(resolved).length, 3);

            // Plain object should be unchanged
            equal(resolved[marker1], definitionMap[marker1]);

            // Shortcut should be converted
            equal(typeof resolved[marker2]?.content, 'function');

            // Factory should be resolved
            equal(typeof resolved[marker3]?.open, 'function');
        });

        it('should skip null/undefined definitions', () => {
            const marker1 = Symbol('valid');
            const marker2 = Symbol('null');
            const marker3 = Symbol('undefined');

            const definitionMap = {
                [marker1]: { open: () => '<a>', close: () => '</a>' },
                [marker2]: null,
                [marker3]: undefined
            };

            const resolved = resolveRangeHooksMap(definitionMap, {});

            // Only valid definition should be present
            equal(Object.getOwnPropertySymbols(resolved).length, 1);
            equal(typeof resolved[marker1], 'object');
            equal(resolved[marker2], undefined);
            equal(resolved[marker3], undefined);
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

            equal(capturedContext, testContext);
        });
    });

    describe('integration with pipeline', () => {
        it('should expose rangeHooksDefinitionMap method', () => {
            const pipeline = html()
                .addLayer([[0, 5]], { open: () => '<a>', close: () => '</a>' })
                .addLayer([[6, 11]], (content) => `<b>${content}</b>`);

            const definitionMap = pipeline.rangeHooksDefinitionMap();

            equal(typeof definitionMap, 'object');
            const keys = Object.getOwnPropertySymbols(definitionMap);
            equal(keys.length, 2);

            // First should be the plain hooks object
            equal(typeof definitionMap[keys[0]], 'object');

            // Second should be the function shortcut
            equal(typeof definitionMap[keys[1]], 'function');
        });

        it('rangeHooksDefinitionMap should return unresolved definitions', () => {
            const factory = {
                createRangeHooks: () => ({
                    open: () => '<tag>',
                    close: () => '</tag>'
                })
            };

            const pipeline = html()
                .addLayer([[0, 5]], factory);

            const definitionMap = pipeline.rangeHooksDefinitionMap();
            const keys = Object.getOwnPropertySymbols(definitionMap);

            // Should return the factory, not the resolved hooks
            equal(definitionMap[keys[0]], factory);
        });

        it('rangeHooksMap should return resolved definitions', () => {
            const factory = {
                createRangeHooks: () => ({
                    open: () => '<tag>',
                    close: () => '</tag>'
                })
            };

            const pipeline = html()
                .addLayer([[0, 5]], factory);

            const hooksMap = pipeline.rangeHooksMap();
            const keys = Object.getOwnPropertySymbols(hooksMap);

            // Should return resolved hooks, not the factory
            equal(typeof hooksMap[keys[0]]?.open, 'function');
            equal(typeof hooksMap[keys[0]]?.close, 'function');
        });
    });
});

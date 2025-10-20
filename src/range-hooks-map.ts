import { createNoProtoObject, fromEntries, functionOrValue, ownKeys } from './utils/misc.js';
import type {
    PipelineLayer,
    RangeHooks,
    RangeHooksDefinition,
    RangeHooksDefinitionMap,
    RangeHooksMap,
    RenderHooks
} from './types.js';

export function createRangeHooksMapFromLayers<RenderOptions, Data, T, R = T, HC = unknown>(
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[]
): RangeHooksDefinitionMap<Data, T, R, HC> {
    return fromEntries(layers.map(
        ({ marker, rangeHooks }) => [marker, rangeHooks]
    ));
}

export function resolveRangeHooksMap<Data, T, R = T, HC = unknown>(
    rangeHooksMap: RangeHooksDefinitionMap<Data, T, R, HC>,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): RangeHooksMap<Data, T, R> {
    const resolvedMap: RangeHooksMap<Data, T, R> = createNoProtoObject();

    for (const key of ownKeys(rangeHooksMap)) {
        const definition = resolveRangeHooksDefinition(rangeHooksMap[key], renderHooks);

        // Skip empty definitions
        if (!definition) {
            continue;
        }

        resolvedMap[key] = definition;
    }

    return resolvedMap;
}

export function resolveRangeHooksDefinition<Data, T, R = T, HC = unknown>(
    definition: RangeHooksDefinition<Data, T, R, HC> | undefined | null,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): RangeHooks<Data, T, R> | null {
    // Resolve factory if needed
    if (definition && 'createRangeHooks' in definition) {
        definition = definition.createRangeHooks(renderHooks?.rangeHooksContext as HC);
    }

    // Function shortcut -> { content: fn }
    if (typeof definition === 'function') {
        definition = { wrap: definition };
    }

    if (definition) {
        // Normalize hooks
        return {
            open: functionOrValue(definition.open, null),
            close: functionOrValue(definition.close, null),
            wrap: functionOrValue(definition.wrap, null),
            text: functionOrValue(definition.text, null),
            replace: functionOrValue(definition.replace, null),
            break: definition.break ?? false
        };
    }

    return null;
}

import type {
    PipelineLayer,
    RangeHooks,
    RangeHooksDefinition,
    RangeHooksDefinitionMap,
    RangeHooksMap,
    RenderHooks
} from './types.js';

function functionOrValue<K, T>(value: K, fallback: T): (K extends Function ? K : T) {
    return typeof value === 'function' ? value as any : fallback as any;
}

export function createRangeHooksMapFromLayers<RenderOptions, Data, T, R = T, HC = unknown>(
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[]
): RangeHooksDefinitionMap<Data, T, R, HC> {
    return Object.fromEntries(layers.map(
        ({ marker, rangeHooks }) => [marker, rangeHooks]
    ));
}

export function resolveRangeHooksMap<Data, T, R = T, HC = unknown>(
    rangeHooksMap: RangeHooksDefinitionMap<Data, T, R, HC>,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): RangeHooksMap<Data, T, R> {
    const resolvedMap: RangeHooksMap<Data, T, R> = Object.create(null);

    for (const key of Reflect.ownKeys(rangeHooksMap)) {
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
        definition = { content: definition };
    }

    if (definition) {
        // Normalize hooks
        return {
            open: functionOrValue(definition.open, null),
            close: functionOrValue(definition.close, null),
            content: functionOrValue(definition.content, null),
            text: functionOrValue(definition.text, null)
        };
    }

    return null;
}

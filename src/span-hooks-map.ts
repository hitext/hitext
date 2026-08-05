import { createNoProtoObject, fromEntries, functionOrValue, ownKeys } from './utils/misc.js';
import type {
    PipelineLayer,
    SpanHooks,
    SpanHooksDefinition,
    SpanHooksDefinitionMap,
    SpanHooksMap,
    RenderHooks
} from './types.js';

export function createSpanHooksDefinitionMapFromLayers<RenderOptions, Data, T, R = T, HC = unknown>(
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[]
): SpanHooksDefinitionMap<Data, T, R, HC> {
    return fromEntries(layers.map(
        ({ marker, spanHooks }) => [marker, spanHooks]
    ));
}

export function resolveSpanHooksMap<Data, T, R = T, HC = unknown>(
    spanHooksDefinitionMap: SpanHooksDefinitionMap<Data, T, R, HC>,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): SpanHooksMap<Data, T, R> {
    const resolvedMap: SpanHooksMap<Data, T, R> = createNoProtoObject();

    for (const key of ownKeys(spanHooksDefinitionMap)) {
        const definition = resolveSpanHooksDefinition(spanHooksDefinitionMap[key], renderHooks);

        // Skip empty definitions
        if (!definition) {
            continue;
        }

        resolvedMap[key] = definition;
    }

    return resolvedMap;
}

export function resolveSpanHooksDefinition<Data, T, R = T, HC = unknown>(
    definition: SpanHooksDefinition<Data, T, R, HC> | undefined | null,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): SpanHooks<Data, T, R> | null {
    // Resolve factory if needed
    if (definition && 'createSpanHooks' in definition) {
        definition = definition.createSpanHooks(renderHooks?.spanHooksContext as HC);
    }

    // Function shortcut -> { wrap: fn }
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

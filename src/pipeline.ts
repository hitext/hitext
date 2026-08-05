import type { PipelineNode, PipelineLayer, CreateRenderHooks } from './types.js';
import { generateSpansFromLayers } from './spans.js';
import { createSpanHooksMapFromLayers, resolveSpanHooksMap } from './span-hooks-map.js';
import { render } from './render.js';
import { createLineBoundaries } from './utils/line-boundaries.js';

export function createRenderPipeline<RenderOptions, T, R = T, HC = undefined>(
    createRenderHooks: CreateRenderHooks<T, R, HC>
) {
    return createPipelineNode<RenderOptions, T, R, HC>(createRenderHooks, []);
}

export function createPipelineNode<RenderOptions, T, R = T, HC = undefined>(
    createRenderHooks: CreateRenderHooks<T, R, HC>,
    layers: PipelineLayer<RenderOptions, any, T, R, HC>[]
): PipelineNode<RenderOptions, T, R, HC> {
    return {
        createRenderHooks,
        layers,
        addLayer(spans, spanHooks = null, name = `layer${layers.length}`) {
            const newLayer: PipelineLayer<RenderOptions, any, T, R, HC> = {
                name,
                marker: Symbol(name),
                spans,
                spanHooks
            };

            return createPipelineNode(createRenderHooks, layers.concat(newLayer));
        },
        spans(document, renderOptions) {
            return generateSpansFromLayers(document, layers, renderOptions, createLineBoundaries(document));
        },
        spanHooksDefinitionMap() {
            return createSpanHooksMapFromLayers(layers);
        },
        spanHooksMap() {
            return resolveSpanHooksMap(createSpanHooksMapFromLayers(layers), createRenderHooks());
        },
        render(document, renderOptions) {
            const lineBoundaries = createLineBoundaries(document);
            const spans = generateSpansFromLayers(document, layers, renderOptions, lineBoundaries);
            const spanHooksMap = createSpanHooksMapFromLayers(layers);
            const renderHooks = createRenderHooks();

            return render(document, spans, spanHooksMap, renderHooks, lineBoundaries);
        }
    };
}

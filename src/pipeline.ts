import type { PipelineNode, PipelineLayer, CreateRenderHooks } from './types.js';
import { generateRangesFromLayers } from './ranges.js';
import { createRangeHooksMapFromLayers, resolveRangeHooksMap } from './range-hooks-map.js';
import { render } from './render.js';

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
        addLayer(ranges, rangeHooks = null, name = `layer${layers.length}`) {
            const newLayer: PipelineLayer<RenderOptions, any, T, R, HC> = {
                marker: Symbol(name),
                ranges,
                rangeHooks
            };

            return createPipelineNode(createRenderHooks, layers.concat(newLayer));
        },
        ranges(source, renderOptions) {
            return generateRangesFromLayers(source, layers, renderOptions);
        },
        rangeHooksDefinitionMap() {
            return createRangeHooksMapFromLayers(layers);
        },
        rangeHooksMap() {
            return resolveRangeHooksMap(createRangeHooksMapFromLayers(layers), createRenderHooks());
        },
        render(source, renderOptions) {
            const ranges = generateRangesFromLayers(source, layers, renderOptions);
            const rangeHooksMap = createRangeHooksMapFromLayers(layers);
            const renderHooks = createRenderHooks();

            return render(source, ranges, rangeHooksMap, renderHooks);
        }
    };
}

import type { PipelineNode, PipelineLayer, CreateRenderHooks } from './types.js';
import { generateRangesFromLayers } from './ranges.js';
import { createRangeHooksMapFromLayers, resolveRangeHooksMap } from './range-hooks-map.js';
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
        addLayer(ranges, rangeHooks = null, name = `layer${layers.length}`) {
            const newLayer: PipelineLayer<RenderOptions, any, T, R, HC> = {
                name,
                marker: Symbol(name),
                ranges,
                rangeHooks
            };

            return createPipelineNode(createRenderHooks, layers.concat(newLayer));
        },
        ranges(document, renderOptions) {
            return generateRangesFromLayers(document, layers, renderOptions, createLineBoundaries(document));
        },
        rangeHooksDefinitionMap() {
            return createRangeHooksMapFromLayers(layers);
        },
        rangeHooksMap() {
            return resolveRangeHooksMap(createRangeHooksMapFromLayers(layers), createRenderHooks());
        },
        render(document, renderOptions) {
            const lineBoundaries = createLineBoundaries(document);
            const ranges = generateRangesFromLayers(document, layers, renderOptions, lineBoundaries);
            const rangeHooksMap = createRangeHooksMapFromLayers(layers);
            const renderHooks = createRenderHooks();

            return render(document, ranges, rangeHooksMap, renderHooks, lineBoundaries);
        }
    };
}

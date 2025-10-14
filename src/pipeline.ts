import { PipelineNode, PipelineNodeState, Ranges, GenerateRanges, RenderHooks } from './types.js';
import { generateRanges } from './generateRanges.js';
import { render } from './render.js';

// Helper to normalize ranges to GenerateRanges function
function normalizeRanges<D, LayerOptions>(ranges: Ranges<D, LayerOptions>): GenerateRanges<D, LayerOptions> {
    if (typeof ranges === 'function') {
        return ranges;
    }

    // Convert array to function
    return (_, createRange) => {
        for (const range of ranges) {
            if (Array.isArray(range)) {
                // Tuple form, i.e. [start, end, data?]
                createRange(range[0], range[1], range[2]);
            } else {
                // Object form, i.e. { start, end, data? }
                createRange(range.start, range.end, range.data);
            }
        }
    };
}

function createPipelineNode<LayerOptions, T, R = T, HC = unknown>(
    state: PipelineNodeState
): PipelineNode<LayerOptions, T, R, HC> {
    return {
        addLayer(ranges, hooks) {
            const marker = Symbol();
            const normalizedRanges = normalizeRanges(ranges);
            const newState: PipelineNodeState = {
                ...state,
                layers: state.layers.concat([{
                    marker,
                    generate: normalizedRanges,
                    hooks
                }])
            };
            return createPipelineNode(newState);
        },
        render(source, layerOptions) {
            const { layers, createRenderHooks } = state;

            // Generate ranges with markers
            const ranges = generateRanges(source, layers, layerOptions);
            const rangeHooks = Object.create(null);
            const renderHooks = createRenderHooks();
            const rangeHooksContext = renderHooks?.rangeHooksContext;

            for (const { marker, hooks } of layers)  {
                rangeHooks[marker] = typeof hooks === 'function'
                    ? hooks(rangeHooksContext)
                    : hooks;
            }

            return render(source, ranges, rangeHooks, renderHooks);
        }
    };
}

export function createPipelineForRenderer<LayerOptions, T, R = T>(
    createRenderHooks: () => Partial<RenderHooks<T, R>>
) {
    return createPipelineNode<LayerOptions, T, R>({
        createRenderHooks,
        layers: []
    });
}

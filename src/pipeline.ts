import { PipelineNode, Ranges, GenerateRanges, CreateRenderHooks, PipelineLayer } from './types.js';
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
    createRenderHooks: CreateRenderHooks,
    layers: PipelineLayer[]
): PipelineNode<LayerOptions, T, R, HC> {
    return {
        createRenderHooks,
        layers,
        addLayer(ranges, hooks) {
            const newLayer: PipelineLayer = {
                marker: Symbol(),
                generate: normalizeRanges(ranges),
                hooks
            };

            return createPipelineNode(
                createRenderHooks,
                layers.concat(newLayer)
            );
        },
        render(source, layerOptions) {
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

export function createRenderPipeline<LayerOptions, T, R = T>(
    createRenderHooks: CreateRenderHooks
) {
    return createPipelineNode<LayerOptions, T, R>(createRenderHooks, []);
}

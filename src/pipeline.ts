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
    function createRangeHooksMap(renderHooks: ReturnType<CreateRenderHooks>) {
        const rangeHooksMap = Object.create(null);
        const rangeHooksContext = renderHooks?.rangeHooksContext;

        for (const { marker, rangeHooks } of layers)  {
            rangeHooksMap[marker] = typeof rangeHooks === 'function'
                ? rangeHooks(rangeHooksContext)
                : rangeHooks;
        }

        return rangeHooksMap;
    }

    return {
        createRenderHooks,
        layers,
        addLayer(ranges, rangeHooks) {
            const newLayer: PipelineLayer = {
                marker: Symbol(),
                generate: normalizeRanges(ranges),
                rangeHooks
            };

            return createPipelineNode(
                createRenderHooks,
                layers.concat(newLayer)
            );
        },
        ranges(source, layerOptions) {
            return generateRanges(source, layers, layerOptions);
        },
        rangeHooksMap() {
            return createRangeHooksMap(createRenderHooks());
        },
        render(source, layerOptions) {
            const ranges = generateRanges(source, layers, layerOptions);
            const renderHooks = createRenderHooks();
            const rangeHooksMap = createRangeHooksMap(renderHooks);

            return render(source, ranges, rangeHooksMap, renderHooks);
        }
    };
}

export function createRenderPipeline<LayerOptions, T, R = T>(
    createRenderHooks: CreateRenderHooks
) {
    return createPipelineNode<LayerOptions, T, R>(createRenderHooks, []);
}

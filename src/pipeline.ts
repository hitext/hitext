import { PipelineNode, Ranges, GenerateRanges, CreateRenderHooks, PipelineLayer } from './types.js';
import { generateRanges } from './generateRanges.js';
import { render } from './render.js';

// Helper to normalize ranges to GenerateRanges function
function normalizeRanges<D, RenderOptions>(ranges: Ranges<D, RenderOptions>): GenerateRanges<D, RenderOptions> {
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

function createPipelineNode<RenderOptions, T, R = T, HC = unknown>(
    createRenderHooks: CreateRenderHooks,
    layers: PipelineLayer[]
): PipelineNode<RenderOptions, T, R, HC> {
    function createRangeHooksMap(renderHooks: ReturnType<CreateRenderHooks>) {
        const rangeHooksMap = Object.create(null);
        const rangeHooksContext = renderHooks?.rangeHooksContext;

        for (const { marker, rangeHooks } of layers)  {
            rangeHooksMap[marker] = typeof rangeHooks === 'function'
                ? { range: rangeHooks }
                : rangeHooks && 'createRangeHooks' in rangeHooks
                    ? rangeHooks.createRangeHooks(rangeHooksContext)
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
        ranges(source, renderOptions) {
            return generateRanges(source, layers, renderOptions);
        },
        rangeHooksMap() {
            return createRangeHooksMap(createRenderHooks());
        },
        render(source, renderOptions) {
            const ranges = generateRanges(source, layers, renderOptions);
            const renderHooks = createRenderHooks();
            const rangeHooksMap = createRangeHooksMap(renderHooks);

            return render(source, ranges, rangeHooksMap, renderHooks);
        }
    };
}

export function createRenderPipeline<RenderOptions, T, R = T, HC = unknown>(
    createRenderHooks: CreateRenderHooks
) {
    return createPipelineNode<RenderOptions, T, R, HC>(createRenderHooks, []);
}

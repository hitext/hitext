import { createRenderPipeline } from '../pipeline.js';

export function createStringRenderer<RenderOptions>() {
    return createRenderPipeline<RenderOptions, string>(() => {
        return {
            // No need for custom hooks, since it's a default
        };
    });
}

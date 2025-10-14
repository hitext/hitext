import { createRenderPipeline } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createStringRenderer<RenderOptions>() {
    return createRenderPipeline<RenderOptions, string>(() => {
        return {
            createBuffer: () => new StringBuffer()
        };
    });
}

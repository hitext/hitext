import { createRenderPipeline } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createStringRenderer<LayerOptions>() {
    return createRenderPipeline<LayerOptions, string>(() => {
        return {
            createBuffer: () => new StringBuffer()
        };
    });
}

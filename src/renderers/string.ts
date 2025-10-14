import { createPipelineForRenderer } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createStringRenderer<LayerOptions>() {
    return createPipelineForRenderer<LayerOptions, string>(() => {
        return {
            createBuffer: () => new StringBuffer()
        };
    });
}

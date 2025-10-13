import { createPipelineForPrinter } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createStringPrinter<LayerOptions>() {
    return createPipelineForPrinter<LayerOptions, string>(() => {
        return {
            createBuffer: () => new StringBuffer()
        };
    });
}

import { createPipelineForRenderer } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createHtmlRenderer() {
    return createPipelineForRenderer(() => {
        return {
            createBuffer: () => new StringBuffer(),
            text: (chunk: string) => chunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

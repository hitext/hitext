import { createRenderPipeline } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createHtmlRenderer() {
    return createRenderPipeline(() => {
        return {
            createBuffer: () => new StringBuffer(),
            text: (chunk: string) => chunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

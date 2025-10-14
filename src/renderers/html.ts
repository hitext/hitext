import { createRenderPipeline } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createHtmlRenderer() {
    return createRenderPipeline(() => {
        return {
            createBuffer: () => new StringBuffer(),
            text: (sourceChunk: string) => sourceChunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

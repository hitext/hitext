import { createRenderPipeline } from '../pipeline.js';

export function createHtmlRenderer() {
    return createRenderPipeline(() => {
        return {
            text: (documentChunk: string) => documentChunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

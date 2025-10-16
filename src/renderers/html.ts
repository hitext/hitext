import { createRenderPipeline } from '../pipeline.js';

export function createHtmlRenderer() {
    return createRenderPipeline(() => {
        return {
            escape: (sourceChunk: string) => sourceChunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

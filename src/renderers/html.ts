import { createRenderPipeline } from '../pipeline.js';

export function createHtmlRenderer<RenderOptions = unknown>() {
    return createRenderPipeline<RenderOptions, string>(() => {
        return {
            text: (documentChunk: string) => documentChunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

import { createRenderPipeline } from '../pipeline.js';
import { createDOMBuffer } from '../utils/buffer-dom.js';

type DomRendererOptions = {
    document: globalThis.Document
}

export function createDomRenderer<RenderOptions>(options?: Partial<DomRendererOptions>) {
    const document = options?.document;

    return createRenderPipeline<RenderOptions, globalThis.Node, globalThis.DocumentFragment>(() => {
        return {
            createBuffer: () => createDOMBuffer(document)
        };
    });
}

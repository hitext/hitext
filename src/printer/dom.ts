import { PrintBuffer } from '../index.js';
import { createPipelineForPrinter } from '../pipeline.js';

type Options = {
    document: globalThis.Document
}

class DOMBuffer implements PrintBuffer<globalThis.Node, globalThis.DocumentFragment> {
    #buffer: globalThis.DocumentFragment;
    constructor(document: globalThis.Document) {
        this.#buffer = document.createDocumentFragment();
    }
    append(child: globalThis.Node | string): void {
        this.#buffer.append(child);
    }
    emit(): globalThis.DocumentFragment {
        return this.#buffer;
    }
}

export function createDomPrinter<LayerOptions>(options?: Partial<Options>) {
    const document = options?.document || globalThis.document;

    return createPipelineForPrinter<LayerOptions, globalThis.Node, globalThis.DocumentFragment>(() => {
        return {
            createBuffer: () => new DOMBuffer(document)
        };
    });
}

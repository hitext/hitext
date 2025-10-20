import { RenderBuffer } from '../types.js';

// Notes:
// - Document is optional for environments like JSDOM or for cross-document rendering
// - DocumentFragment inherits from Node, so Node includes DocumentFragment
export class DOMBuffer implements RenderBuffer<globalThis.Node, globalThis.DocumentFragment> {
    #buffer: globalThis.DocumentFragment;
    constructor(document: globalThis.Document = globalThis.document) {
        this.#buffer = document.createDocumentFragment();
    }
    append(child: globalThis.Node | string): void {
        this.#buffer.append(child);
    }
    emit() {
        return this.#buffer;
    }
}

export const createDOMBuffer = (document?: globalThis.Document) => new DOMBuffer(document);

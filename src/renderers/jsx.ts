import { RenderBuffer } from '../types.js';
import { createRenderPipeline } from '../pipeline.js';

// JSX element type - can be a React element, Preact VNode, or any JSX-compatible element
type JSXElement = any;
type JSXChild = JSXElement | string | number | boolean | null | undefined;

class JSXBuffer implements RenderBuffer<JSXChild, JSXChild[]> {
    #buffer: JSXChild[] = [];
    append(child: JSXChild): void {
        this.#buffer.push(child);
    }
    emit(): JSXChild[] {
        return this.#buffer;
    }
}

export function createJSXRenderer<RenderOptions>() {
    return createRenderPipeline<RenderOptions, JSXChild, JSXChild[]>(() => {
        return {
            createBuffer: () => new JSXBuffer()
        };
    });
}

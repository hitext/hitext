import { createRenderPipeline } from '../pipeline.js';
import { createArrayBuffer } from '../utils/buffer-array.js';

// JSX element type - can be a React element, Preact VNode, or any JSX-compatible element
type JSXElement = { [key: string]: any };
type JSXChild = JSXElement | string | number | boolean | null | undefined;

export function createJSXRenderer<RenderOptions>() {
    return createRenderPipeline<RenderOptions, JSXChild, JSXChild[]>(() => {
        return {
            createBuffer: createArrayBuffer<JSXChild>
        };
    });
}

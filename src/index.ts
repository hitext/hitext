// exports
export type * from './types.d.js';

// Re-export generators (both namespace and direct)
export {
    rangeLines,
    rangeLineContents,
    rangeMatch,
    rangeNewlines
} from './generators/index.js';

// Re-export renderers
export { string, html, dom, tty, jsx } from './renderers/index.js';

// Re-export helpers
export { createRenderPipeline } from './pipeline.js';
export { render } from './render.js';

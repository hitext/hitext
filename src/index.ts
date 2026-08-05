// TypeScript types
export type * from './types.d.js';

// Renderers
export { string, html, dom, tty, jsx } from './renderers/index.js';

// Low-level core helpers
export { render } from './render.js';
export {
    createRenderPipeline,
    createPipelineNode
} from './pipeline.js';
export {
    generateSpansFromLayers,
    generateSpans,
    processSpans
} from './spans.js';
export {
    createSpanHooksDefinitionMapFromLayers,
    resolveSpanHooksMap,
    resolveSpanHooksDefinition
} from './span-hooks-map.js';

// Span sources: generators and combiners
export {
    spansCompose,
    spansConcat,
    spansFromLines,
    spansFromMatch,
    spansFrom,
    spansFromLayer,
    spansFromOptions,
    spansWithFallback
} from './span-sources/index.js';

// Span transformers: curried functions for composition
export {
    applyAppend,
    applyAugment,
    applyCollapseTo,
    applyDataMap,
    applyExpandTo,
    applyFallback,
    applyFilter,
    applyFitToWindow,
    applyFork,
    applyInvert,
    applyMap,
    applyMerge,
    applyPadLines,
    applyResetOrigin,
    applySort,
    applyTake
} from './span-compose/index.js';

export {
    spanHooksHide
} from './span-hooks/index.js';

// Utils
export {
    StringBuffer,
    createStringBuffer,
    ArrayBuffer,
    createArrayBuffer,
    DOMBuffer,
    createDOMBuffer,
    // LineBoundaries re-exported from types.d.ts
    createLineBoundaries
} from './utils/index.js';

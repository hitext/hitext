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
    generateRangesFromLayers,
    generateRanges,
    processRanges
} from './ranges.js';
export {
    createRangeHooksMapFromLayers,
    resolveRangeHooksMap,
    resolveRangeHooksDefinition
} from './range-hooks-map.js';

// Range sources: generators and combiners
export {
    rangesCompose,
    rangesConcat,
    rangesForLines,
    rangesForMatch,
    rangesFrom,
    rangesFromLayer,
    rangesFromOptions,
    rangesWithFallback
} from './range-sources/index.js';

// Range transformers: curried functions for composition
export {
    applyAppend,
    applyAugment,
    applyCollapseTo,
    applyDataMap,
    applyExpandTo,
    applyFallback,
    applyFilter,
    applyFitToWindow,
    applyInvert,
    applyMap,
    applyMerge,
    applyPadLines,
    applyPick,
    applyResetOrigin,
    applySort,
    applyTake
} from './range-compose/index.js';

export {
    rangeHooksHide
} from './range-hooks/index.js';

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

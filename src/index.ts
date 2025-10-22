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
    rangesForLines,
    rangesForMatch,
    rangesForPoint,
    rangesFrom,
    rangesFromLayer,
    rangesFromOptions,
    concatRanges,
    coalesceRanges
} from './range-sources/index.js';

// Range transformers: curried functions for composition
export {
    applyMerge,
    applyInvert,
    applyExpandTo,
    applyCollapseTo,
    applyFitToWindow,
    applyFilter,
    applyDataMap,
    applySort,
    applyPick,
    applyPadLines,
    applyResetOrigin,
    // Functional composition helper
    composeRanges
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

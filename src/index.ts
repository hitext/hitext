// Re-export types
export type * from './types.d.js';

// Re-export generators (both namespace and direct)
export {
    rangeLines,
    rangeLineContents,
    rangeMatch,
    rangeNewlines,
    rangeCombine,
    rangeMerge,
    rangeInvert,
    rangeExpandTo,
    rangeCollapseTo,
    rangeFitToWindow
} from './generators/index.js';

// Re-export renderers
export { string, html, dom, tty, jsx } from './renderers/index.js';

// Re-export helpers
export { render } from './render.js';
export {
    createLineBoundaries,
    getSharedLineBoundaries,
    setSharedLineBoundaries
} from './utils/line-boundaries.js';
export type { LineBoundaries } from './utils/line-boundaries.js';
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

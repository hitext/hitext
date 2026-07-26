## Development Guidelines

IMPORTANT! Always operate within the **new API** design. Do **not** reference or rely on any "old API". We're refining the new unreleased API.

### ⚠️ Documentation Sync Critical

**If any code change contradicts this document (AGENTS.md), you MUST immediately raise the need to update the documentation.**

This includes changes to:
- API signatures, parameters, or return types
- Core concepts, terminology, or definitions
- Architecture, flow, or component responsibilities
- Design patterns or implementation requirements
- Test structure or validation requirements

**If a user requests to follow specific coding or testing patterns that are not covered by this document (AGENTS.md), you SHOULD suggest to extend the document.**

This document is the SOURCE OF TRUTH for development of the project. Outdated documentation leads to confusion, bugs, and technical debt.

### Critical Workflow

- **Validate Early** - `npm test` during development, `npm run fast-check` for quick validation, `npm run check` before committing
- **Public API Only in Tests** - Import from `src/index.ts` or `src/types.d.ts` only (validates API surface, catches breaking changes)

### Architecture

**Core Flow:** Document Text → Layers (Ranges + Hooks) → Render Pipeline → Output

**Pipeline Creation:**
```
createRenderPipeline(renderer) → .addLayer(ranges, hooks, name?) → .render(document, options?)
```

**Internal Flow:**
1. `generateRangesFromLayers()` - Collects ranges from all layers
2. `resolveRangeHooksMap()` - Normalizes hook definitions
3. `render()` - Sorts/filters ranges, manages stack, executes hooks (open/text/wrap/replace/close)

**Key Modules:**

- **pipeline.ts** - Pipeline API (creation, layers, orchestration)
- **ranges.ts** - Range generation from various inputs
- **render.ts** - Rendering engine (sorting, stack management, hook execution)
- **range-hooks-map.ts** - Hook resolution and normalization
- **range-sources/** - Range generators (patterns, lines, data)
- **range-compose/** - Range transformers (filter, merge, expand, collapse, invert)
- **range-hooks/** - Hook utilities
- **renderers/** - Output formats (string, html, dom, tty, jsx)

### Glossary

**Ranges:**
- **Range** - Attributed half-open interval or boundary in document-relative coordinates, with `start`/`end` offsets (zero-based, end-exclusive) and optional `data`/`origin`
- **Range Data** - Custom metadata (match results, diagnostics, token types)
- **Range Origin** - Operation-specific lineage reference to one or more ranges that produced a derivative
- **Range Value** - A record `{start, end, data?, origin?}` or tuple `[start, end, data?, origin?]`
- **Range Iterable** - Iterable collection of Range Values
- **Range Set** - Collection of ranges
- **Range Source** - A Range Iterable or a generator function producing ranges (`Ranges`)
- **Range Normalization** - Converting Range Values to `GeneratedRange` records `{type, start, end, data?, origin?}` during pipeline generation; `type` carries the current Layer Marker
- **Segment** - Portion of a generated range between interruptions; ranges split into segments during rendering for intersection/conflict resolution
- **Range Generator** - Function producing ranges via `createRange(start, end, data?, origin?)` callback
- **Range Transformer** - Curried function taking a Range Source and returning a new generator (enables composition)
- **Range Derivative** - Range created from another range

**Text:**
- **Document** - Input text for pipeline (the `document` parameter in render functions)
- **Lines** - LineBoundaries instance - a set of helpers attached to document (getLine, getColumn, getOffset, getLineStart, getLineEnd, etc.)
- **Line** - Full line text including trailing newlines
- **Line Content** - Line text excluding trailing newlines

**Pipeline:**
- **Renderer** - Output format handler providing `createRenderHooks()` for buffer management
- **Render Pipeline** - Immutable layer chain: `createRenderPipeline()` → `.addLayer()` → `.render()`
- **Layer Configuration** - Range Source + Range Hook Definition + optional user-supplied name
- **Layer** - Runtime layer record with an assigned name, unique Layer Marker, Range Source and Range Hook Definition
- **Layer Marker** - Marker stored as `layer.marker` and copied to `generatedRange.type`; `addLayer()` creates a unique symbol, while low-level `PipelineLayer` records may supply another `RangeMarker`
- **Render Options** - Per-call user config available to generators and Range Operation Callbacks (theme, viewport); Range Hook Context does not include render options
- **Render Buffer** - Output accumulator with `append()` and `emit()`; child buffers accumulate nested content, and emitted results attach to parent buffers up to the root result returned by `render()`

**Hooks:**
- **Range Hook Definition** - Layer rendering input: partial hooks, `wrap` shortcut, Range Hook Factory or nullish value
- **Range Hooks** - Resolved functions and flags applied to each segment: `open`, `close`, `wrap`, `text`, `replace`, `break`
- **Range Hook Factory** - Renderer-specific definition exposing `createRangeHooks(rendererContext)`
- **Range Hook Context** - Data passed to callable Range Hooks: `document`, `offset`, `line`, `column`, `start`, `end`, `range`, `data`, `lines` (LineBoundaries)
- **Renderer Hooks** - Renderer-level buffer, text and lifecycle behavior (`RenderHooks`)
- **Generation Context** - Data passed by pipeline generation: `renderOptions`, `marker`, `rangesByMarker`, `rangesByName`, `lines` (LineBoundaries). The context type also has an optional `ranges` field for low-level callers, but pipeline generation does not populate it.
- **Range Operation Context** - Data passed to Range Operation Callbacks: `document`, `lines` (LineBoundaries), `renderOptions`, `ranges`, `index`. `index` is a mutable zero-based input position for per-range callbacks; comparator callbacks should not rely on it.

### Project Structure

```
src/
├── index.ts              # Public API exports
├── types.d.ts            # TypeScript type definitions
├── pipeline.ts           # Pipeline creation and layer management
├── ranges.ts             # Range generation (generateRanges, processRanges)
├── range-hooks-map.ts    # Hook resolution and normalization
├── render.ts             # Core rendering engine
├── range-sources/        # Range generators (rangesForMatch, rangesForLines, etc.)
├── range-compose/        # Range transformers (applyFilter, applyMerge, etc.)
├── range-hooks/          # Render hooks (rangeHooksHide, etc.)
├── renderers/            # Output renderers (string, html, dom, tty, jsx)
└── utils/                # Utilities (buffers, line-boundaries)

test/
├── utils.ts              # Test helpers (generateRanges, renderRanges, etc.)
├── range-sources/        # Mirror src structure
├── range-compose/        # Mirror src structure
└── *.test.ts             # Core module tests

docs/
├── range-functions-reference.md  # Range functions implementation reference
└── README.md             # Getting started guide
```

**Note:** Test files mirror source structure: `src/range-compose/apply-*.ts` → `test/range-compose/apply-*.test.ts`

### Useful Commands

```bash
npm test              # Run source unit tests (fast feedback)
npm run lint          # Lint (no autofix)
npm run lint:fix      # Lint with autofix
npm run typecheck     # TypeScript type check
npm run fast-check    # lint + test + typecheck
npm run build         # Transpile/bundle/emit types
npm run check         # Full validation: lint:fix + test + typecheck + build + test builds/bundles
```

## Range Functions

**See:** [`docs/range-functions-guidelines.md`](docs/range-functions-guidelines.md) for complete implementation requirements, patterns, and design principles.

### Implementation Workflow

1. **Implement** - Create file with JSDoc, update exports → `npm test`
2. **Test** - Write function-specific tests → `npm run lint:fix && npm run typecheck`
3. **Document** - Update [Quick Reference](docs/range-functions-reference.md#quick-reference) and function section ([Range Sources](docs/range-functions-reference.md#range-sources) or [Range Transformers](docs/range-functions-reference.md#range-transformers))
4. **Validate** - `npm run check` before committing

**Checklist:**
- [File structure](docs/range-functions-guidelines.md#file-structure)
- [JSDoc](docs/range-functions-guidelines.md#jsdoc-template)
- [Test structure](docs/range-functions-guidelines.md#test-structure)
- [Signature patterns](docs/range-functions-guidelines.md#signature-patterns)
- [Documentation sync](docs/range-functions-guidelines.md#documentation-sync)

**Design changes?** Update [Design Principles](docs/range-functions-guidelines.md#design-principles) or [Core Concepts](docs/range-functions-guidelines.md#core-concepts) as needed.

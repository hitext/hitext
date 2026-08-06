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
- **Benchmark Renderer Changes** - Run `npm run benchmark` before and after traversal, ordering, or buffer changes

### Architecture

**Core Flow:** Document Text → Layers (Span Sources + Span Hooks) → Render Pipeline → Output

**Pipeline Creation:**
```
createRenderPipeline(createRenderHooks) → .addLayer(spans, spanHooks, name?) → .render(document, options?)
```

**Internal Flow:**
1. `generateSpansFromLayers()` - Collects spans from all layers
2. `resolveSpanHooksMap()` - Normalizes hook definitions
3. `render()` - Filters spans, resolves layer-ordered boundary events and segments, executes hooks (open/text/wrap/replace/close)

**Key Modules:**

- **pipeline.ts** - Pipeline API (creation, layers, orchestration)
- **spans.ts** - Span generation from various inputs
- **render.ts** - Rendering engine (sorting, stack management, hook execution)
- **span-hooks-map.ts** - Hook resolution and normalization
- **span-sources/** - Span generators (patterns, lines, data)
- **span-compose/** - Span transformers (filter, merge, expand, collapse, invert)
- **span-hooks/** - Hook utilities
- **renderers/** - Output formats (string, html, dom, tty, jsx)

### Glossary

**Spans:**
- **Span** - Text fragment of document with integer `start`/`end` offsets (zero-based, end-exclusive), optional `data`/`origin`
- **Span Data** - Custom metadata (match results, diagnostics, token types); hook context exposes the declared `Data` type, so include `undefined` in `Data` when layer spans may omit data
- **Span Origin** - Reference to source span(s) that produced a derivative (tracks transformation lineage); origin data is `unknown` because data-changing transformers can preserve roots with a different data type
- **Span Input** - Various forms: record `{start, end, data?, origin?}` or tuple `[start, end, data?, origin?]`
- **Span Set** - Collection of spans
- **Span Source** - Iterable of Span Inputs, or a function producing spans
- **Span Normalization** - Converting input forms to standard record format `{start, end, data, origin}` during span generation
- **Span Segment** - Portion of span between interruptions; spans split into segments during rendering for intersection/conflict resolution
- **Span Generator** - Function producing spans via `createSpan(start, end, data?, origin?)` callback
- **Span Transformer** - Curried function taking span input, returning a generator; `TransformSpans<InputData, RenderOptions, OutputData>` tracks data changes through composition
- **Span Derivative** - Span created from another span

**Text:**
- **Document** - Input text for pipeline (the `document` parameter in render functions)
- **Lines** - LineBoundaries instance - a set of helpers attached to document (getLine, getColumn, getOffset, getLineStart, getLineEnd, etc.)
- **Line** - Full line text including trailing newlines
- **Line Content** - Line text excluding trailing newlines

**Pipeline:**
- **Render Hooks Factory** - Function passed to `createRenderPipeline()` that creates output-specific render hooks and buffers
- **Renderer Factory** - Public output-specific function (`string`, `html`, `dom`, `tty`, `jsx`) that creates a configured render pipeline
- **Render Pipeline** - Immutable layer chain: `createRenderPipeline()` → `.addLayer()` → `.render()`
- **Layer** - Span source + span hooks definition + optional name; earlier renderable layers are outer to later layers in overlap regions
- **Render Options** - User config passed to span generators and operation callbacks (theme, viewport)
- **Render Buffer** - Output accumulator (string/DOM/JSX); subbuffers created during render (on hook execution), emitted results attach to parent buffer up to top buffer (result of `render()`)

**Hooks:**
- **Span Hooks** - Render functions applied to each span segment: `open`, `close`, `wrap`, `text`, `replace`, `break` flag, and point-only `point` mode
- **Point Placement** - Boundary policy for a point span: layer-relative between layers by default, or explicitly inside/outside all spans touching the boundary
- **Hook Context** - Data passed to hooks: `hook`, `document`, `lines`, `offset`, `line`, `column`, `start`, `end`, `spanIndex`, `spanText`, `span`, `data`, `createBuffer`, `dump`; span-level `text` hooks receive the context of the span that owns the selected hook
- **Renderer Hook Context** - Renderer-level `open`, `text`, and `close` hooks use a synthetic span covering the document with `data: undefined` and `spanIndex: -1`; `text` hook `start`/`end` describe the current document chunk
- **Generation Context** - Optional generation state: `renderOptions`, `marker`, `spans`, `spansByMarker`, `spansByName`, `lines`; pipeline generation supplies all except caller-provided `spans`
- **Operation Context** - Data passed to operation callbacks: `document`, `lines`, `renderOptions`, `spans`, `index`

### Project Structure

```
src/
├── index.ts              # Public API exports
├── types.d.ts            # TypeScript type definitions
├── pipeline.ts           # Pipeline creation and layer management
├── spans.ts              # Span generation (generateSpans, processSpans)
├── span-hooks-map.ts     # Hook resolution and normalization
├── render.ts             # Core rendering engine
├── span-sources/         # Span generators (spansFromMatch, spansFromLines, etc.)
├── span-compose/         # Span transformers (applyFilter, applyMerge, etc.)
├── span-hooks/           # Render hooks (spanHooksHide, etc.)
├── renderers/            # Output renderers (string, html, dom, tty, jsx)
└── utils/                # Utilities (buffers, line-boundaries)

test/
├── utils.ts              # Test helpers
├── span-sources/         # Mirror src structure
├── span-compose/         # Mirror src structure
├── span-hooks/           # Mirror src structure
└── *.test.ts             # Core module tests

benchmark/
├── render.ts             # Renderer traversal benchmark suite
└── README.md             # Benchmark usage and interpretation

docs/
├── span-functions-guidelines.md  # Span function development guidelines
└── span-functions-reference.md   # Span functions implementation reference
```

**Note:** Test files mirror source structure: `src/span-compose/apply-*.ts` → `test/span-compose/apply-*.test.ts`

### Useful Commands

```bash
npm test              # Run source unit tests (fast feedback)
npm run lint          # Lint (no autofix)
npm run lint:fix      # Lint with autofix
npm run typecheck     # TypeScript type check
npm run fast-check    # lint + test + typecheck
npm run build         # Transpile/bundle/emit types
npm run check         # Full validation: lint:fix + test + typecheck + build + test builds/bundles
npm run benchmark     # Measure renderer traversal scenarios
```

## Span Functions

**See:** [`docs/span-functions-guidelines.md`](docs/span-functions-guidelines.md) for complete implementation requirements, patterns, and design principles.

### Implementation Workflow

1. **Implement** - Create file with JSDoc, update exports → `npm test`
2. **Test** - Write function-specific tests → `npm run lint:fix && npm run typecheck`
3. **Document** - Update [Quick Reference](docs/span-functions-reference.md#quick-reference) and function section ([Span Sources](docs/span-functions-reference.md#span-sources) or [Span Transformers](docs/span-functions-reference.md#span-transformers))
4. **Validate** - `npm run check` before committing

**Checklist:**
- [File structure](docs/span-functions-guidelines.md#file-structure)
- [JSDoc](docs/span-functions-guidelines.md#jsdoc-template)
- [Test structure](docs/span-functions-guidelines.md#test-structure)
- [Signature patterns](docs/span-functions-guidelines.md#signature-patterns)
- [Documentation sync](docs/span-functions-guidelines.md#documentation-sync)

**Design changes?** Update [Design Principles](docs/span-functions-guidelines.md#design-principles) or [Core Contracts](docs/span-functions-guidelines.md#core-contracts) as needed.

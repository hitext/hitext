# Design and Architecture

HiText separates document analysis, interval composition, render interpretation, and output materialization. The separation is small enough to use as a library but explicit enough to expose intermediate products and support non-string outputs.

## Architecture overview

```text
Document text
    -> Layers
        -> Range generation and transformation
        -> Hook definitions
    -> Hook resolution
    -> Range ordering and segmentation
    -> Renderer buffers
    -> Output
```

The public pipeline orchestrates these stages. It does not require one analyzer, one annotation tree, or one output format.

## Module boundaries

The source modules have focused responsibilities:

| Module | Responsibility |
|---|---|
| `pipeline.ts` | Immutable pipeline creation, layers, and orchestration |
| `ranges.ts` | Range source processing, range value normalization, and layer evaluation |
| `range-sources/` | Sources and source combiners |
| `range-compose/` | Curried range transformers |
| `range-hooks-map.ts` | Definition collection and renderer-specific resolution |
| `render.ts` | Filtering, sorting, active stack, segmentation, and hook execution |
| `range-hooks/` | Reusable interpretation utilities |
| `renderers/` | Built-in output materializations |
| `utils/` | Buffers, line boundaries, and operation context |

This structure follows the data flow. A range transformer does not need to know how HTML is escaped, and a DOM buffer does not need to know how a diagnostic was found.

## Why stand-off ranges

Embedding annotations into text immediately destroys the stable coordinate space needed by independent analyzers. Stand-off ranges keep every provider anchored to one unchanged document.

That permits arbitrary overlaps:

```text
syntax:       [---------)
search:            [---------)
diagnostic:     [--------------)
```

Providers do not parse or coordinate each other's generated markup. The render engine resolves intersections once, after all layers have described their intent.

## Why layers

Geometry and rendering semantics have different producers but must meet somewhere. A layer is that binding point:

```text
ranges + hooks + optional dependency name
```

Keeping the binding explicit avoids global registries and hidden printer lookup. Null hooks also let a layer exist purely as an analytical product for downstream composition.

## Why immutable pipelines

Immutable `addLayer()` has three practical effects:

- a configured prefix can be reused by several derived views;
- construction order and dependencies remain visible;
- adding behavior in one location does not mutate pipelines retained elsewhere.

Immutability applies to pipeline construction. A render call still creates fresh generated ranges, hook context, buffers, and renderer state.

## Why named dependencies

Complex views often need the output of analysis, not another scan of source text. `rangesFromLayer(name)` turns generated annotations into reusable input.

This makes derivation explicit:

```text
diagnostics
    -> diagnostic highlighting
    -> context windows -> omitted regions
    -> end points -> fix suggestions
```

Evaluation remains ordered and deterministic, while the conceptual dependency graph can branch and join.

## Why curried transformers

A transformer configured as `applyExpandTo('line', 2)` can be composed, reused, and tested independently of its eventual source. Currying gives every operation a uniform source-to-generator shape:

```text
TransformRanges = Ranges -> GenerateRanges
```

`rangesCompose()` then reads in the same order as the geometry changes.

## Why origin

Geometry alone does not answer which source annotations produced a derivative. `origin` preserves that relationship where it is meaningful.

One-to-many transforms can share one origin; merges can aggregate several origins; collapse can move geometry while retaining source identity. Transformations such as inversion intentionally have no direct origin, and semantic data replacement may clear it.

Origin supports traceability and structural generation without forcing all applications into a global graph object.

## Why segments

Stand-off intervals can cross, but HTML, DOM, JSX, and most structured outputs require nesting. Segments are the operational bridge.

The render engine temporarily closes and reopens crossing ranges at event boundaries. Hooks receive current segment geometry alongside the complete generated range and stable `rangeIndex`.

This preserves arbitrary input intersections while satisfying tree-shaped materialization. Segment production remains internal in 2.0; only hook events expose it.

## Why buffers

Rendering directly into one string would make object outputs special cases. The buffer protocol abstracts accumulation:

```text
append child
emit result
```

Nested buffers let `wrap` receive completed renderer-native child content. The same traversal can therefore build strings, DOM fragments, JSX child arrays, or application-defined structures.

## Why hooks

Hooks separate annotation meaning from output mechanics. A source says which interval is a diagnostic; hooks say whether that diagnostic wraps content, emits boundary markers, transforms text, replaces content, or breaks surrounding annotations.

Factories defer renderer-specific hooks until resolution. This is essential for stateful output such as TTY styling while keeping ordinary sources renderer-independent.

## Why not an editor

Editors own mutable documents, selections, transactions, incremental parsing, viewport scheduling, input methods, and interaction state. HiText owns none of those concerns.

An editor or viewer can use HiText to materialize a range-based view, but HiText does not compete with CodeMirror or Monaco as an editing platform. Its smaller scope also makes it useful in servers, build tools, CLIs, reports, and non-interactive document transformations.

## Architectural evolution

The initial releases established the core idea: independent annotations over source text should combine before output. The 1.x beta API expressed this through decorators, `.use()` chains, printer types, and printer sets.

TypeScript work revealed that those dynamic factory relationships had no clean static model. HiText 2.0 replaces them with explicit sources, transformers, layers, hook definitions, renderer contexts, and buffers.

The redesign also broadens the role of ranges. They are now intermediate computational products used for selection, derivation, projection, insertion, aggregation, and introspection rather than only final decoration coordinates.

## Future decomposition

The architecture exposes several domains that may be useful independently:

```text
matching -> range algebra -> rendering -> HiText orchestration
```

HiMatch already addresses matching as its own concern. Names such as HiRange and HiRender describe possible future boundaries, not committed packages or timelines.

Likewise, standalone segmentation could support annotation export and debugging tools. In 2.0 segmentation remains an internal render operation, so public code should consume hook context rather than internal stack structures.

## Design constraints

The current architecture deliberately favors:

- one immutable source coordinate space;
- explicit ordered evaluation;
- public intermediate products;
- output-type independence;
- small composable primitives;
- documented provenance behavior;
- application ownership of parsing, ranking, and incremental invalidation.

See [Computational Model](computational-model.md) for the formal stage model and [Rendering Model](rendering-model.md) for traversal details.

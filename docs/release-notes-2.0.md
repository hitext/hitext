# HiText 2.0

HiText 2.0 is a complete redesign of the library. It keeps the original problem at its center: independent text annotations should compose without corrupting source offsets or each other's output. Everything around that idea has been rebuilt to make composition explicit, typed, inspectable, and independent of one output format.

This is not a syntax-compatible upgrade from the 1.x beta API. See [Migration from HiText 1.x](migration-from-1.x.md) for the practical mapping.

## Why a redesign

Work on TypeScript definitions exposed a structural problem in the previous chain and factory API. It was flexible at runtime, but important relationships were implicit: a decorator combined analysis and printer behavior, chains changed shape dynamically, and types had no clear place to express the data flowing between operations.

Adding more generics would have described the accidental complexity rather than removed it. The redesign instead makes the computational pieces first-class:

```text
document
    -> range sources and transformations
    -> ordered layers
    -> resolved range hooks
    -> renderer buffers
    -> output
```

## From decorators to layers

The central unit is now a layer:

```js
pipeline.addLayer(ranges, rangeHooks, name);
```

A layer binds range geometry to rendering behavior without packaging either into a global decorator registry. A layer may also be analytical: with null hooks it contributes ranges for later layers without producing output itself.

Pipelines are immutable. `addLayer()` returns a new node, making prefixes reusable and dependencies easier to reason about.

## Ranges as composable data

HiText 2.0 treats ranges as more than final decoration coordinates. Sources and curried transformers form a small range algebra:

```js
rangesCompose(
    rangesFromLayer('errors'),
    applyExpandTo('line', 2),
    applyMerge(),
    applyInvert()
)
```

Built-in operations can filter, sort, expand, collapse, merge, invert, map, augment, fork, append, take, and fit ranges to line windows. This moves selection logic out of ad hoc render hooks and makes intermediate geometry testable.

## Named dependencies

Layers can name their results and later layers can consume them through `rangesFromLayer()`:

```js
const pipeline = html()
    .addLayer(errorRanges, errorHooks, 'errors')
    .addLayer(
        rangesCompose(
            rangesFromLayer('errors'),
            applyExpandTo('line', 1)
        ),
        contextHooks
    );
```

This creates explicit ordered dataflow. The error source is evaluated once; its normalized ranges can feed highlighting, context selection, insertion points, and summaries.

## Derivatives and provenance

Generated ranges may carry an `origin` reference to the source range or ranges that produced them. Provenance survives geometry transformations according to each operation's documented policy.

Origin enables patterns that are difficult to express as decoration alone:

- merge context windows while retaining their contributing matches;
- collapse annotations to insertion points;
- aggregate headings into a generated table of contents;
- trace a displayed summary back to source annotations.

The [Range Functions Reference](range-functions-reference.md) states when an operation inherits, aggregates, creates, or clears origin.

## Annotation-preserving projections

HiText can now build reduced views while preserving annotations in retained source regions:

```js
const excerpts = html()
    .addLayer(
        rangesForMatch(/ERROR/g),
        content => `<mark>${content}</mark>`,
        'matches'
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('matches'),
            applyExpandTo('line', 1),
            applyInvert()
        ),
        rangeHooksHide()
    );
```

Selections, omissions, highlighting, and renderer state are resolved in one traversal. There is no completed HTML, DOM, JSX tree, or ANSI string to cut and repair afterward.

This supports search snippets, diagnostic excerpts, code folding, diff context, log filtering, redaction, progressive detail, and application-defined output budgets.

## Renderer-independent output

The render traversal no longer assumes strings. A renderer supplies a buffer protocol and optional text or lifecycle hooks. The same range model can produce:

- plain strings;
- escaped HTML strings;
- ANSI terminal output with nested style restoration;
- DOM `DocumentFragment` values;
- JSX-compatible children;
- application-defined structured output.

Crossing ranges are segmented before they reach tree-shaped output. Range identity remains available even when one annotation produces several render segments.

## Hooks describe interpretation

Range hooks make output behavior explicit:

- `open` and `close` emit around a segment;
- `wrap` receives a segment's completed child buffer;
- `text` transforms source chunks;
- `replace` consumes source text and emits synthetic output;
- `break` strengthens interruption at a boundary.

The function shorthand remains concise for the common `wrap` case:

```js
content => `<mark>${content}</mark>`
```

Renderer-specific hook factories support stateful behavior without coupling ordinary range sources to a renderer. The TTY style helpers use this mechanism.

## Pipeline introspection

A pipeline is no longer a black box. HiText exposes several stages:

```js
pipeline.ranges(document, options);
pipeline.rangeHooksDefinitionMap();
pipeline.rangeHooksMap();
pipeline.render(document, options);
```

Applications can inspect generated annotations, compare option-dependent geometry, examine definitions before and after renderer resolution, and test materialization independently.

## TypeScript-first public API

The new architecture gives TypeScript stable concepts to describe:

- range data and render options;
- sources, generators, and transformers;
- layer and pipeline products;
- hook contexts and renderer output;
- buffer child and result types;
- renderer-specific factory context.

Different layers may carry different data types without forcing the complete pipeline into one universal payload. The remaining inference limits, especially named layer lookup, are documented rather than hidden behind type-level machinery.

## Built for extension

The public package includes both high-level renderer pipelines and low-level primitives for generation, hook resolution, rendering, buffers, and line boundaries. Domain libraries can build on HiText without copying the core traversal.

Examples include diagnostic excerpt builders, log report toolkits, source viewers, redaction pipelines, and context projectors for constrained downstream consumers.

## Testing and validation

The 2.0 implementation is tested through public entry points so tests validate the package surface as well as internal behavior. The suite covers range functions, line boundaries, hook resolution, nested and crossing ranges, replacements, zero-width insertion, renderer buffers, TTY state restoration, DOM, and JSX.

The project validation workflow is:

```text
lint -> unit tests -> typecheck -> build -> built-artifact tests
```

## Package shape

HiText has no runtime dependencies. Renderer and range utilities are exported as ESM-friendly modules, allowing consumers and bundlers to include only the parts they use.

For the current build, the complete ESM bundle is 15,214 bytes minified and 5,857 bytes after gzip. The minified UMD build is 16,359 bytes and 6,283 bytes after gzip. These values were measured from `npm run build` artifacts with `wc -c` and `gzip -c`; final release figures should be remeasured from the published commit.

## Compatibility

There is no backward-compatibility layer for 1.x decorators, `.use()` chains, callable decorate pipelines, or printer sets. Those abstractions map to different ownership boundaries in 2.0 and would obscure the new model if retained.

Applications using the beta API should migrate one decorator at a time: separate its range source from printer behavior, add it as a layer, then replace cross-decorator logic with named dependencies and range transformations.

## Direction beyond 2.0

The redesign exposes several reusable problem domains: matching, range algebra, rendering, and orchestration. HiMatch already represents matching as a separate concern. HiRange and HiRender are useful names for possible future decomposition, not package or schedule commitments.

Likewise, render segmentation may eventually become an independently observable range operation. In 2.0 it remains part of the render engine; applications should not depend on an unexported segmentation API.

## Continue reading

- [Getting Started](getting-started.md) introduces the public workflow.
- [Core Concepts](core-concepts.md) defines ranges, segments, layers, buffers, and projections.
- [Layers and Pipeline](layers-and-pipeline.md) covers orchestration and introspection.
- [Range Functions Guide](range-functions-guide.md) explains range composition patterns.
- [Migration from HiText 1.x](migration-from-1.x.md) maps old concepts to the new API.

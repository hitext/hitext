# Layers and Pipeline

A render pipeline is an ordered, immutable description of how HiText should generate ranges and render them. A layer is its unit of composition:

```text
range source + range hooks + optional name
```

```js
const nextPipeline = pipeline.addLayer(ranges, hooks, name);
```

This guide focuses on orchestration. See [Range Functions Reference](range-functions-reference.md) for creating and transforming ranges and [Range Hooks](range-hooks.md) for rendering behavior.

## Immutable construction

Renderer factories create empty pipelines:

```js
import { html } from 'hitext';

const base = html();
```

`addLayer()` returns a new pipeline and leaves its receiver unchanged:

```js
const withSearch = base.addLayer(searchRanges, searchHooks, 'search');
const complete = withSearch.addLayer(diagnosticRanges, diagnosticHooks);

base.layers.length;        // 0
withSearch.layers.length;  // 1
complete.layers.length;    // 2
```

This makes a configured prefix reusable. Several views can share tokenization or diagnostics and add different projection or presentation layers afterward.

## Layer names and markers

Every layer created through `addLayer()` has a unique symbol `marker` used internally to associate generated ranges with resolved hooks. The marker becomes the generated range's `type`:

```js
const [range] = pipeline.ranges(document);

range.type === pipeline.layers[0].marker;
```

A layer also has a string `name`. Supply a meaningful name when later layers need its ranges:

```js
pipeline.addLayer(errorRanges, errorHooks, 'errors');
```

If a name is omitted, `addLayer()` assigns `layer0`, `layer1`, and so on. Markers provide identity even when names are reused, but duplicate names are ambiguous for `rangesFromLayer()`. Use unique names for dependencies.

Low-level callers of `createPipelineNode()` provide complete `PipelineLayer` records themselves. In that API, `name` remains optional and marker uniqueness is the caller's responsibility.

## Ordered dependencies

`rangesFromLayer(name)` reads the normalized ranges produced by an earlier named layer:

```js
import {
    applyExpandTo,
    rangesCompose,
    rangesFromLayer
} from 'hitext';

const pipeline = html()
    .addLayer(errorRanges, errorHooks, 'errors')
    .addLayer(
        rangesCompose(
            rangesFromLayer('errors'),
            applyExpandTo('line', 1)
        ),
        contextHooks,
        'error-context'
    );
```

Layers are evaluated from first to last. A source can depend only on results generated before its own layer. The pipeline is linear to evaluate, but dependencies can form a directed graph: one layer may combine several prior layers, and several later layers may reuse the same result.

```js
rangesConcat(
    rangesFromLayer('errors'),
    rangesFromLayer('warnings')
)
```

Named dependencies reuse generated ranges. They do not run the original source again.

## Generation context

A generator receives the document, a `createRange()` callback, and generation context:

```js
function ranges(document, createRange, context) {
    // context.renderOptions
    // context.marker
    // context.rangesByMarker
    // context.rangesByName
    // context.lines
}
```

| Field | Meaning |
|---|---|
| `renderOptions` | Options passed to `pipeline.ranges()` or `pipeline.render()` |
| `marker` | Marker assigned to the layer currently being generated |
| `rangesByMarker` | Previous results grouped by their unique marker |
| `rangesByName` | Previous results grouped by layer name |
| `lines` | `LineBoundaries` helpers for the source document |

Prefer `rangesFromLayer()` over reading `rangesByName` directly when a named layer is the complete source. Direct context access is useful when a generator needs several products or broader pipeline state.

The `GenerateRangesContext` type also has an optional `ranges` field for low-level callers of `generateRanges()` and `processRanges()`. Pipeline generation does not populate that field; use the grouped maps to access previous layer results.

## Render options

Render options are per-call input to range generation:

```js
const compact = pipeline.render(document, { detail: 'compact' });
const full = pipeline.render(document, { detail: 'full' });
```

They are available to generators and range-operation callbacks as `renderOptions`. `rangesFromOptions()` adapts an option field or callback into a range source:

```js
const selections = rangesFromOptions('selections');

const visible = rangesFromOptions(options => {
    return options.detail === 'full'
        ? rangesFrom('document')
        : rangesFromLayer('summaries');
});
```

Render options affect generation, not pipeline structure. Reusing one pipeline with several option sets avoids rebuilding its layer definitions.

## Pipeline products

The pipeline exposes four stages for rendering, testing, and tooling.

### Generated ranges

```js
const ranges = pipeline.ranges(document, renderOptions);
```

This evaluates all layers and normalizes their output without resolving hooks or rendering. Inspect `type`, `start`, `end`, `data`, and `origin` to debug geometry and dependencies.

### Hook definitions

```js
const definitions = pipeline.rangeHooksDefinitionMap();
```

Definitions are keyed by layer marker and preserve the form passed to `addLayer()`: a partial object, `wrap` shorthand, range hook factory, or nullish value.

### Resolved hooks

```js
const hooks = pipeline.rangeHooksMap();
```

This resolves shortcuts and renderer-specific factories into normalized hook objects. A layer with no hook definition is omitted from the resolved map and does not participate in rendering, though its ranges remain available to dependent layers.

### Materialized output

```js
const output = pipeline.render(document, renderOptions);
```

`render()` generates ranges, resolves hooks for a fresh renderer context, segments intersections, executes hooks, and returns the root buffer's emitted result.

## Analytical layers

A layer does not need rendering hooks. Use `null` when its purpose is to compute ranges for later layers:

```js
const report = html()
    .addLayer(rangesForMatch(/ERROR/g), null, 'errors')
    .addLayer(
        rangesCompose(
            rangesFromLayer('errors'),
            applyExpandTo('line', 2)
        ),
        contextHooks
    );
```

The first layer contributes dataflow but no output. This separation is useful for shared selections, classification, aggregation, and projection geometry.

## Reusing pipelines

A pipeline can process different documents as long as its range sources derive offsets for each input:

```js
const highlightErrors = html().addLayer(
    rangesForMatch(/ERROR/g),
    content => `<mark>${content}</mark>`
);

highlightErrors.render(firstLog);
highlightErrors.render(secondLog);
```

Static range arrays are tied to a coordinate space chosen by the application. Do not reuse them with unrelated documents unless those offsets are valid for every document.

## Inspecting a pipeline

Layer records make structure visible:

```js
for (const layer of pipeline.layers) {
    console.log({
        name: layer.name,
        marker: layer.marker,
        hasHooks: layer.rangeHooks != null
    });
}
```

For generated counts by layer, group `pipeline.ranges()` by each range's `type`, or compare it with `pipeline.layers[].marker`. For lineage, inspect `range.origin` recursively.

The [API Reference](api-reference.md#pipeline) lists the exact inspection method contracts.

## Testing pipelines

Test through the public package entry point. Keep geometry and materialization assertions separate:

```js
const ranges = pipeline.ranges(document, options);
assert.deepEqual(
    ranges.map(({ start, end }) => [start, end]),
    expectedRanges
);

assert.equal(
    pipeline.render(document, options),
    expectedOutput
);
```

For dependent pipelines, cover missing and empty upstream layers, duplicate or incorrect names, multiple render options, and adjacent or crossing output ranges. For immutable construction, assert the behavior of both the base and extended pipeline when reuse matters.

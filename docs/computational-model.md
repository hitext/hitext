# Computational Model

HiText evaluates attributed intervals over an immutable string and interprets them into a renderer-defined output. This page states that model as a sequence of observable stages.

For introductory definitions, start with [Core Concepts](core-concepts.md). For implementation-level traversal details, continue with [Rendering Model](rendering-model.md).

## Source model

The source is one JavaScript string called the document. Its coordinate space is the set of UTF-16 string offsets from `0` through `document.length`.

A range uses a half-open interval:

```text
[start, end)
```

`start` is included and `end` is excluded. A point range has `start === end` and represents a source boundary rather than source content.

The document is not mutated. Output may have different length and structure, but all generated ranges continue to address the source coordinate space.

## Annotation model

A range input is an attributed interval:

```js
{
    start,
    end,
    data,
    origin
}
```

`data` belongs to the application or range source. `origin` records lineage from a derivative to one or more source ranges.

Pipeline generation adds a `type` marker:

```js
{
    type,
    start,
    end,
    data,
    origin
}
```

The marker connects a generated range to its layer and therefore to its range hook definition. Equal geometry does not imply equal annotation identity.

## Layer evaluation

A pipeline has an ordered list of layers. For each layer, generation:

1. Evaluates its iterable or generator against the document.
2. Normalizes tuple and record input into generated range records.
3. Assigns the layer marker as `range.type`.
4. Stores that layer's result by marker and name.
5. Makes those grouped results available to subsequent layers.

Layers are evaluated once per `ranges()` or `render()` call. A named dependency reads the completed result of an earlier layer; it cannot refer forward.

The order is linear to execute, while the dependency structure may branch and join.

## Range normalization

Iterable input accepts tuples and records:

```js
[start, end, data, origin]
{ start, end, data, origin }
```

Generator input emits the same fields through `createRange()`:

```js
createRange(start, end, data, origin);
```

Normalization does not render, sort, clamp, merge, or deduplicate ranges. Those are separate operations. Geometry transformations happen only when a source or transformer requests them.

## Hook resolution

Each layer contributes a hook definition keyed by its marker. Before rendering, definitions are resolved against renderer hooks:

- a function becomes `{ wrap: function }`;
- a factory calls `createRangeHooks(rendererContext)`;
- missing callable hooks become `null`;
- missing `break` becomes `false`;
- nullish definitions are omitted.

Ranges whose marker has no resolved hooks remain useful during layer generation but are filtered out of render traversal.

## Ordering and segmentation

Render traversal filters invalid or non-renderable ranges, then sorts them by source start, interruption weight, end, and layer priority. See [Rendering Model](rendering-model.md#range-ordering) for the exact comparison.

Nested intervals already fit a tree-shaped traversal. Crossing intervals do not:

```text
A: [--------)
B:     [--------)
```

HiText turns crossings into render segments. A range may close temporarily and reopen while retaining its generated-range identity.

Segmentation is currently internal to `render()`. The public API exposes segment boundaries to hooks as `context.start` and `context.end`, but it does not return a standalone segment list.

## Hook interpretation

For an ordinary range segment, traversal performs:

```text
open -> source text and nested ranges -> wrap -> close
```

For a replacement segment:

```text
open -> replace -> wrap -> close
```

`wrap` is present only when defined and receives the emitted child buffer. `text` is selected from the nearest active range that defines it, falling back to the renderer text hook.

Replacement advances the source offset to the replacement range end. Fully contained ranges are skipped. Crossing ranges may continue after the replacement unless interruption rules force a stronger boundary.

## Target materialization

A renderer supplies a buffer factory:

```ts
interface RenderBuffer<T, R> {
    append(child: string | T | R): void;
    emit(): R;
}
```

The render engine creates a root buffer. A range with `wrap` creates a child buffer, renders the segment into it, emits the child, calls `wrap`, and appends the result to the parent.

The traversal is shared. Materialization differs:

- string buffers concatenate text;
- the HTML renderer transforms source chunks before string buffering;
- the TTY renderer emits state transitions into a string buffer;
- DOM buffers append nodes and fragments;
- JSX buffers collect child values;
- custom buffers may build another representation.

## Projections

Decoration changes representation while preserving all source content. Projection changes which source intervals are materialized.

Projection is expressed with ordinary ranges and hooks, typically:

```text
interesting intervals
    -> context expansion
    -> union
    -> inversion
    -> replacement of omitted intervals
```

Because omitted intervals participate in the same traversal, annotations in retained regions preserve their source identities and renderer semantics.

## Observable products

A pipeline exposes three conceptual levels and four methods:

```text
generated annotations       pipeline.ranges()
hook definitions            pipeline.rangeHooksDefinitionMap()
resolved interpretation     pipeline.rangeHooksMap()
materialized output         pipeline.render()
```

These products make geometry, renderer resolution, and final output independently testable.

## Non-goals

HiText does not parse source languages, own an editor state model, define a markup language, or provide a syntax grammar. It does not assign semantic meaning to range data.

Rendering is not incremental or streaming across `render()` calls. Each call generates the current ranges, resolves hooks, sorts renderable annotations, and materializes a complete result.

HiText can build the mechanics of a budgeted or ranked projection, but it does not choose relevance or optimize a budget on behalf of an application.

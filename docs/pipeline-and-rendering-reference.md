# Pipeline and Rendering Reference

Public API reference for creating render pipelines, attaching layers, defining hooks, and materializing output. For span sources and transformations, see the [Span Functions Reference](span-functions-reference.md).

## Table of Contents

- [Pipeline Creation](#pipeline-creation)
- [Pipeline Nodes](#pipeline-nodes)
- [Layers and Names](#layers-and-names)
- [Span Hook Definitions](#span-hook-definitions)
- [Span Hook Context](#span-hook-context)
- [Renderer Hooks](#renderer-hooks)
- [Render Buffers](#render-buffers)
- [Span Validation and Participation](#span-validation-and-participation)
- [Ordering and Segments](#ordering-and-segments)
- [Replacement and Interruption](#replacement-and-interruption)
- [Built-in Renderers](#built-in-renderers)

## Pipeline Creation

Built-in renderer factories create configured pipelines:

```typescript
string<RenderOptions>()
html<RenderOptions>()
tty<RenderOptions>()
dom<RenderOptions>()
jsx<RenderOptions>()
```

Use `createRenderPipeline()` for a custom output target:

```typescript
createRenderPipeline<RenderOptions, Child, Result, FactoryContext>(
    createRenderHooks
): PipelineNode<RenderOptions, Child, Result, FactoryContext>
```

`createRenderHooks` is called whenever renderer hooks are resolved. This happens once for every `.render()` call and separately when `.spanHooksMap()` is inspected. Mutable renderer state should therefore be created inside this factory.

## Pipeline Nodes

Pipelines are immutable layer chains. Adding a layer returns a new node and does not modify the earlier node.

```typescript
interface PipelineNode<RenderOptions, Child, Result, FactoryContext> {
    addLayer<Data>(
        spans: SpansSource<Data, RenderOptions>,
        spanHooks: SpanHooksDefinition<Data, Child, Result, FactoryContext> | null,
        name?: string
    ): PipelineNode<RenderOptions, Child, Result, FactoryContext>;

    spans(document: string, options?: RenderOptions): GeneratedSpan[];
    spanHooksMap(): SpanHooksMap<any, Child, Result>;
    spanHooksDefinitionMap(): SpanHooksDefinitionMap<any, Child, Result, FactoryContext>;
    render(document: string, options?: RenderOptions): Result;
}
```

### `.addLayer()`

Adds a span source, optional rendering hooks, and an optional name.

### `.spans()`

Evaluates every layer and returns its generated spans. Analytical layers with `null` hooks are included.

### `.spanHooksDefinitionMap()`

Returns layer hook definitions before shortcuts and factories are resolved.

### `.spanHooksMap()`

Creates renderer hooks, resolves layer hook factories, and returns normalized hooks. Calling it is a separate hook-resolution operation and does not render a document.

### `.render()`

Generates layer spans, resolves renderer and span hooks, traverses renderable spans, and returns one renderer-defined result.

## Layers and Names

Each layer contains:

```typescript
type PipelineLayer<RenderOptions, Data, Child, Result, FactoryContext> = {
    name?: string;
    marker: SpanMarker;
    spans: SpansSource<Data, RenderOptions>;
    spanHooks?: SpanHooksDefinition<Data, Child, Result, FactoryContext> | null;
};
```

When `name` is omitted, `.addLayer()` assigns `layer${index}`, starting with `layer0`. An explicit name can be read by later layers through `spansFromLayer(name)`.

Layer names should be unique within a pipeline when they are used as dependencies. Prefer domain names such as `diagnostics`, `visible-context`, or `omissions` rather than relying on generated names.

A layer with `null` hooks is analytical: its spans are generated, named, and available to later layers, but do not directly contribute output.

## Span Hook Definitions

A layer accepts three hook-definition forms.

### Hook object

```typescript
{
    open?: SpanHookOpen | null;
    close?: SpanHookClose | null;
    wrap?: SpanHookWrap | null;
    text?: SpanHookText | null;
    replace?: SpanHookReplace | null;
    break?: boolean;
    point?: 'inside' | 'outside';
}
```

### Wrap shortcut

```typescript
(content, context) => result
```

This is normalized to `{ wrap: shortcut }`.

### Span-hook factory

```typescript
{
    createSpanHooks(factoryContext) {
        return hooks;
    }
}
```

`factoryContext` is exactly the value exposed by the renderer as `spanHooksContext`. It is not the renderer hook object and is distinct from the `SpanHookContext` passed during traversal.

Factories may return a hook object, a wrap shortcut, `null`, or `undefined`.

## Span Hooks

```typescript
open(context): Child | Result | string | null | undefined
close(context): Child | Result | string | null | undefined
wrap(content, context): Child | Result | string | null | undefined
text(documentChunk, context): Child | Result | string | null | undefined
replace(context): Child | Result | string | null | undefined
```

- `open` contributes before one materialized span segment.
- `close` contributes after one materialized span segment.
- `wrap` receives the emitted child-buffer result for one segment.
- `text` converts a source-document chunk while its owning span is active.
- `replace` contributes another value instead of normal source text for its selected region.

Direct hook results equal to `null`, `undefined`, or `''` are not appended to a render buffer.

One generated span may be materialized as several segments. Hooks must not assume one invocation per generated span.

## Span Hook Context

```typescript
type SpanHookContext<Data, Child, Result> = {
    hook: 'open' | 'close' | 'wrap' | 'text' | 'replace';
    document: string;
    lines: LineBoundaries;
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    spanIndex: number;
    spanText: string;
    span: GeneratedSpan<Data>;
    data: Data;
    createBuffer(): RenderBuffer<Child, Result>;
    dump(): SpanHookContextDump<Data>;
};
```

- `span` is the complete generated span that owns the selected hook.
- `data` is `span.data`. Include `undefined` in the declared data type when layer spans may omit data.
- `spanText` is `document.slice(span.start, span.end)`.
- For `open`, `wrap`, and `close`, `start` and `end` describe the current materialized segment.
- For `text`, `start` and `end` describe the current document chunk, while `span` identifies the owner of the selected text hook.
- For `replace`, `start` and `end` describe the selected replacement segment.
- `spanIndex` is stable across repeated segments of one generated span within one render. It is not persistent across render calls.
- `offset`, `line`, and `column` describe the current render position; line and column are one-based.
- `createBuffer()` creates another buffer using the active renderer contract.

For renderer-level hooks, context uses a synthetic span covering `[0, document.length)`, with `data: undefined` and `spanIndex: -1`.

## Renderer Hooks

```typescript
interface RenderHooks<Child, Result, FactoryContext> {
    createBuffer(): RenderBuffer<Child, Result>;
    open(context: SpanHookContext<any, Child, Result>): Child | null;
    close(context: SpanHookContext<any, Child, Result>): Child | null;
    text: SpanHookText<any, Child, Result> | null;
    spanHooksContext?: FactoryContext;
}
```

- Renderer `open` runs once before document traversal.
- Renderer `close` runs once after document traversal.
- Renderer `text` is the fallback source-text conversion.
- `spanHooksContext` supplies dependencies to layer `createSpanHooks()` factories.

When active spans define `text` hooks, the innermost active text hook wins. If none defines one, the renderer-level text hook is used.

## Render Buffers

```typescript
interface RenderBuffer<Child, Result> {
    append(child: string | Child | Result): void;
    emit(): Result;
}
```

The renderer creates a root buffer. A span with `wrap` receives a child-buffer result, and its wrapper result is appended to the parent buffer.

Buffers define target accumulation policy: string concatenation, DOM insertion, array flattening, text-node normalization, or another representation-specific operation.

## Span Validation and Participation

Span offsets use zero-based, end-exclusive UTF-16 code-unit positions. Renderable `start` and `end` values must be integers and satisfy `start <= end`.

During `.render()`, a generated span is excluded from traversal when:

- its layer has no resolved hooks;
- `start` or `end` is not an integer;
- `start > end`.

This filtering is silent. Use `.spans()` to inspect generated analytical data when output is missing.

Offsets outside the document are not rejected by this validation. Application span sources should normally emit coordinates within the document unless a function documents a deliberate boundary convention, such as the default trailing boundary of `applyInvert()`.

## Ordering and Segments

Layer registration order is nesting precedence. In every overlap region:

- an earlier renderable layer is outer;
- a later renderable layer is inner;
- crossing spans are segmented as needed to preserve that order;
- equal spans nest in registration order.

For a pipeline, this order is the sequence of `.addLayer()` calls. For the low-level `render()` function, it is the own-key order of `spanHooksDefinitionMap` after JavaScript property-key ordering rules are applied.

Geometry still determines when spans become active and inactive. Within one layer, geometric nesting applies; a later-ending crossing span becomes outer over the overlap. Fully tied spans from the same layer retain source iteration order.

Ordering is directional: earlier layers establish the less fragmented outer structure, while later layers are segmented around earlier boundaries when required. Register sections before lines when section nodes should contain lines; register lines before sections when every line must remain an independent outer row. Reordering renderable layers is therefore an observable output-structure change.

Only layers with resolved render hooks participate in this nesting order. Analytical layers remain available to generation and named-layer lookup but do not create materialized ancestry.

Nested spans can be materialized directly. Crossing spans are divided into properly nested materialized segments. The complete generated record remains available as `context.span`; current segment boundaries are exposed as `context.start` and `context.end`.

`break: true` is an explicit exception to normal layer precedence. It closes surrounding interpretations and places the breaking span outside them for the interrupted region.

See [Rendering Overlapping Spans](6-rendering-overlapping-spans.md) for the operational model and examples.

## Replacement and Interruption

A non-empty `replace` span consumes its selected source region. Its replacement output is emitted at the nesting depth of its layer; earlier layers may wrap it, while later layers are interrupted around it. A point replacement where `start === end` inserts output without consuming source text.

Spans fully contained by a replaced region do not receive normal materialization for the consumed source text. Spans extending beyond the replaced region may still materialize their remaining source coverage.

`replace` preserves surrounding spans from earlier layers and interrupts spans from later layers. Set `break: true` when all surrounding interpretations must close before the replacement and resume afterward as later segments.

Point spans use `point`:

- omitted is the default and places the point inside earlier layers and outside later layers;
- `'inside'` places it inside every non-replacement span touching the boundary;
- `'outside'` places it outside every non-replacement span touching the boundary.

Touching includes strict containment and shared start or end boundaries. Points from different layers at one offset are resolved as one boundary event, so a shared outer segment can contain all points assigned beneath it. When all touching spans belong to one layer and `point` is omitted, the renderer preserves the ordinary same-layer geometry, replacement, and source-order rules. `break: true` overrides `point` and places the point outside surrounding spans.

Use omitted `point` for normal layer-relative insertion. Explicit `'inside'` or `'outside'` is a boundary override across all touching layers, including spans that start or end at the point offset.

The built-in `spanHooksHide()` helper combines replacement with interruption behavior appropriate for omissions.

## Built-in Renderers

- `string()` preserves ordinary source chunks.
- `html()` escapes `&`, `<`, and `>` in ordinary source chunks. Hook-generated markup is not escaped automatically.
- `tty()` manages terminal-oriented style output.
- `dom()` creates DOM output.
- `jsx()` creates JSX-compatible output.

For a structured target, see [Creating a Custom Renderer](create-custom-renderer.md).

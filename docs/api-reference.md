# API Reference

This page summarizes the public exports of the `hitext` package. Range source and transformer signatures are documented in detail in [Range Functions Reference](range-functions-reference.md).

## Renderers

### `string<RenderOptions>()`

Creates a pipeline that emits an unescaped string.

### `html()`

Creates a pipeline that emits an HTML string. Source document chunks escape `&`, `<`, and `>`; range hook output is appended as-is.

### `tty<RenderOptions>()`

Creates a pipeline that emits a string with ANSI foreground and background colors.

Static helpers:

```ts
tty.createStyle(...styles)
tty.createStyleMap(map, fetcher?)
```

Both helpers return renderer-specific `RangeHooksFactory` definitions.

### `dom<RenderOptions>(options?)`

Creates a pipeline that emits a `DocumentFragment`.

```ts
dom({ document?: Document })
```

The default buffer uses `globalThis.document` when no document is supplied.

### `jsx<RenderOptions>()`

Creates a pipeline that emits an array of JSX-compatible children. Element creation belongs to range hooks and their JSX runtime.

See [Renderers](renderers.md) for examples and output contracts.

## Pipeline

### `createRenderPipeline()`

```ts
createRenderPipeline<RenderOptions, T, R = T, HC = undefined>(
    createRenderHooks: CreateRenderHooks<T, R, HC>
): PipelineNode<RenderOptions, T, R, HC>
```

Creates an empty pipeline for a renderer. `T` is the buffer child type, `R` is the emitted result type, and `HC` is context exposed to range hook factories.

### `pipeline.addLayer()`

```ts
pipeline.addLayer<Data = unknown>(
    ranges: Ranges<Data, RenderOptions>,
    rangeHooks: RangeHooksDefinition<Data, T, R, HC> | null,
    name?: string
): PipelineNode<RenderOptions, T, R, HC>
```

Returns a new pipeline containing the layer. `ranges` can be an iterable of tuples/records or a generator. `name` makes generated ranges available to later layers through `rangesFromLayer()`.

When omitted, a name such as `layer0` is assigned. Every layer also receives a unique symbol marker.

### `pipeline.render()`

```ts
pipeline.render(document: string, options?: RenderOptions): R
```

Generates all ranges, resolves range hooks for the renderer, and materializes the output.

### `pipeline.ranges()`

```ts
pipeline.ranges(
    document: string,
    options?: RenderOptions
): GeneratedRange[]
```

Generates normalized ranges for every layer without rendering. Each generated range has `type`, `start`, `end`, and optional `data` and `origin` fields. `type` is the layer marker.

### `pipeline.rangeHooksDefinitionMap()`

Returns definitions keyed by layer marker. Values may still be shortcuts or renderer-specific factories.

### `pipeline.rangeHooksMap()`

Resolves definitions against a new renderer hooks instance and returns normalized `RangeHooks` keyed by layer marker.

### `pipeline.layers`

The ordered layer records used by the pipeline. Treat the array and its records as introspection data; construct changed pipelines with `addLayer()`.

### `pipeline.createRenderHooks`

The renderer factory used to resolve hooks and render output. This is primarily useful for low-level integrations.

## Range input

```ts
type RangeTuple<Data = unknown> = [
    start: number,
    end: number,
    data?: Data,
    origin?: RangeOrigin<Data>
];

type RangeRecord<Data = unknown> = {
    start: number;
    end: number;
    data?: Data;
    origin?: RangeOrigin<Data>;
};

type Ranges<Data, RenderOptions> =
    | Iterable<RangeTuple<Data> | RangeRecord<Data>>
    | GenerateRanges<Data, RenderOptions>;
```

Offsets are zero-based and `end` is exclusive. Zero-width ranges have equal start and end offsets.

## Range generators

```ts
type GenerateRanges<Data, RenderOptions> = (
    document: string,
    createRange: CreateRange<Data>,
    context?: GenerateRangesContext<Data, RenderOptions>
) => void;
```

`createRange(start, end, data?, origin?)` appends a generated range for the current layer.

Generation context contains:

| Field | Meaning |
|---|---|
| `renderOptions` | Options passed to `ranges()` or `render()` |
| `marker` | Marker of the layer being generated |
| `ranges` | Previously generated ranges |
| `rangesByMarker` | Previous ranges grouped by layer marker |
| `rangesByName` | Previous ranges grouped by layer name |
| `lines` | `LineBoundaries` for the document |

## Range sources

- `rangesForMatch(pattern)` finds string or regular expression matches.
- `rangesForLines(type?)` produces line intervals or boundary points.
- `rangesFrom(input)` adapts document keywords, iterables, or range-producing functions.
- `rangesFromLayer(name)` reads a previous named layer.
- `rangesFromOptions(keyOrCallback)` reads a range source from render options.
- `rangesConcat(...sources)` concatenates source results.
- `rangesWithFallback(...sources)` uses the first non-empty source.
- `rangesCompose(source, ...transformers)` applies transformations left to right.

See [Range Sources](range-functions-reference.md#range-sources).

## Range transformers

- `applyAppend`
- `applyAugment`
- `applyCollapseTo`
- `applyDataMap`
- `applyExpandTo`
- `applyFallback`
- `applyFilter`
- `applyFitToWindow`
- `applyFork`
- `applyInvert`
- `applyMap`
- `applyMerge`
- `applyPadLines`
- `applyResetOrigin`
- `applySort`
- `applyTake`

See [Range Transformers](range-functions-reference.md#range-transformers) for signatures, geometry, data, origin, order, and cardinality behavior.

## Range hooks

```ts
interface RangeHooks<Data, T, R = T> {
    open: RangeHookOpen<Data, T, R> | null;
    close: RangeHookClose<Data, T, R> | null;
    wrap: RangeHookWrap<Data, T, R> | null;
    text: RangeHookText<Data, T, R> | null;
    replace: RangeHookReplace<Data, T, R> | null;
    break: boolean;
}
```

Definitions are partial and can also use a `wrap` function shortcut or `RangeHooksFactory`. Resolved maps contain the complete normalized shape above.

See [Range Hooks](range-hooks.md) for hook order, segmentation, and context.

### `rangeHooksHide(options?)`

```ts
rangeHooksHide<T, R>(options?: {
    ellipsis?: T | R | ((side: 'start' | 'middle' | 'end') => T | R);
    skippedLines?: T | R | (
        (newline: 'before' | 'after' | 'both') => T | R
    );
}): Partial<RangeHooks<unknown, T, R>>
```

Creates `replace`, `open`, and `close` hooks plus `break: true` for line-aware omission rendering.

## Hook context

`RangeHookContext<Data, T, R>` contains the source document, line helpers, current offset, segment boundaries, stable range index, original generated range, range text, data, compatible buffer factory, and `dump()` helper.

The important boundary distinction is:

```text
context.start/end        current render segment
context.range.start/end  complete generated range
```

## Line boundaries

`createLineBoundaries(document)` returns one-based line/column helpers over a string:

- `getLine()`, `getColumn()`, and `getOffset()` convert coordinates.
- `getLineStart()`, `getLineEnd()`, and `getLineContentEnd()` find boundaries.
- `getLineText()` and `getLineContentText()` read complete or newline-free text.
- `isLineStart()`, `isLineEnd()`, and `isLineContentEnd()` test boundaries.
- `getNewlineText()` preserves `\n`, `\r\n`, or `\r`.
- `getLastLine()`, `getLinesNumber()`, and maximum-end helpers summarize lines.
- `getLineDiff()` and `isSameLine()` compare offsets.

## Buffers

Public buffer implementations and factories:

- `StringBuffer`, `createStringBuffer`
- `ArrayBuffer`, `createArrayBuffer`
- `DOMBuffer`, `createDOMBuffer`

All implement `append(child)` and `emit()`.

## Low-level APIs

The package also exports the functions used by pipeline orchestration:

- `render`
- `createPipelineNode`
- `generateRangesFromLayers`
- `generateRanges`
- `processRanges`
- `createRangeHooksMapFromLayers`
- `resolveRangeHooksMap`
- `resolveRangeHooksDefinition`

Prefer renderer pipelines for application code. The low-level functions are intended for custom orchestration, renderers, debugging tools, and tests that need explicit intermediate products.

## Exported types

All declarations in `src/types.d.ts` are exported from the package root, including pipeline, range, hook, context, renderer, buffer, marker, and line boundary types. See [TypeScript](typescript.md) for common generic patterns.

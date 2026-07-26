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

```ts
pipeline.rangeHooksDefinitionMap():
    RangeHooksDefinitionMap<any, T, R, HC>
```

Returns definitions keyed by layer marker. Values may still be shortcuts or renderer-specific factories.

### `pipeline.rangeHooksMap()`

```ts
pipeline.rangeHooksMap(): RangeHooksMap<any, T, R>
```

Resolves definitions against a new renderer hooks instance and returns normalized `RangeHooks` keyed by layer marker.

### `pipeline.layers`

```ts
pipeline.layers: PipelineLayer<RenderOptions, any, T, R, HC>[]
```

The ordered runtime layer records used by the pipeline. Treat the array and its records as introspection data; construct changed pipelines with `addLayer()`.

### `pipeline.createRenderHooks`

```ts
pipeline.createRenderHooks: CreateRenderHooks<T, R, HC>
```

The renderer-hooks factory used to resolve hooks and render output. This is primarily useful for low-level integrations.

## Range values and sources

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

A `RangeTuple` or `RangeRecord` is one range value. `Ranges` is a range source: either an iterable of range values or a generator. Offsets are zero-based and `end` is exclusive. Zero-width ranges have equal start and end offsets.

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
| `rangesByMarker` | Previous ranges grouped by layer marker |
| `rangesByName` | Previous ranges grouped by layer name |
| `lines` | `LineBoundaries` for the document |

The `GenerateRangesContext` type also permits an optional `ranges` field for low-level callers. Pipeline generation does not populate it; previous layer products are available through `rangesByMarker` and `rangesByName`.

## Range operation context

```ts
interface RangeOperationContext<RenderOptions = any> {
    document: string;
    lines: LineBoundaries;
    renderOptions?: RenderOptions;
    ranges: Array<RangeRecord<any>>;
    index: number;
}
```

Range-operation callbacks receive the complete collected input through `ranges`. Per-range operations update `index` to the current zero-based input position. Sort comparators should not rely on `index`, since it is not updated for comparator calls.

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

```ts
createLineBoundaries(document: string): LineBoundaries

interface LineBoundaries {
    getLine(offset: number, lines?: number): number;
    getColumn(offset: number, lines?: number): number;
    getOffset(line: number, column?: number): number;

    getLineStart(offset: number, lines?: number): number;
    getLineEnd(offset: number, lines?: number): number;
    getLineContentEnd(offset: number, lines?: number): number;

    isLineStart(offset: number): boolean;
    isLineEnd(offset: number): boolean;
    isLineContentEnd(offset: number): boolean;

    getNewlineText(offset: number, lines?: number): string;
    getLineText(offset: number, lines?: number): string;
    getLineContentText(offset: number, lines?: number): string;

    getLastLine(): number;
    getLinesNumber(): number;
    getMaxLineEnd(fromLine?: number, toLine?: number): number;
    getMaxLineContentEnd(fromLine?: number, toLine?: number): number;

    getLineDiff(offset1: number, offset2: number): number;
    isSameLine(offset1: number, offset2: number): boolean;
}
```

Offset arguments use document-relative UTF-16 coordinates. Line and column values are one-based. Methods accepting `lines` move by a signed line count and clamp to available lines. Newline-aware methods preserve `\n`, `\r\n`, or `\r`.

## Buffers

Public buffer implementations and factories:

```ts
new StringBuffer(): RenderBuffer<string, string>
createStringBuffer(): StringBuffer

new ArrayBuffer<T>(): RenderBuffer<T, NestedArray<T>>
createArrayBuffer<T>(): ArrayBuffer<T>

new DOMBuffer(document?: Document):
    RenderBuffer<Node, DocumentFragment>
createDOMBuffer(document?: Document): DOMBuffer
```

All implement `append(child)` and `emit()`. `ArrayBuffer` preserves nested emitted arrays rather than flattening them. `DOMBuffer` defaults to `globalThis.document`.

## Low-level APIs

### `render()`

```ts
render<T, R = T, HC = unknown>(
    document: string,
    ranges: GeneratedRange[],
    rangeHooksDefinitionMap?:
        RangeHooksDefinitionMap<any, T, R, HC> | null,
    renderHooks?: Partial<RenderHooks<T, R, HC>>,
    lineBoundaries?: LineBoundaries | null
): R
```

### `createPipelineNode()`

```ts
createPipelineNode<RenderOptions, T, R = T, HC = undefined>(
    createRenderHooks: CreateRenderHooks<T, R, HC>,
    layers: PipelineLayer<RenderOptions, any, T, R, HC>[]
): PipelineNode<RenderOptions, T, R, HC>
```

### `generateRangesFromLayers()`

```ts
generateRangesFromLayers<RenderOptions, Data, T, R, HC>(
    document: string,
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[],
    renderOptions?: RenderOptions,
    lines?: LineBoundaries
): GeneratedRange<Data>[]
```

### `generateRanges()`

```ts
generateRanges<Data, RenderOptions>(
    document: string,
    input: Ranges<Data, RenderOptions>,
    context?: GenerateRangesContext<Data, RenderOptions>
): GeneratedRange<Data>[]
```

### `processRanges()`

```ts
processRanges<Data, RenderOptions>(
    document: string,
    input: Ranges<Data, RenderOptions>,
    createRange: CreateRange<Data>,
    context?: GenerateRangesContext<Data, RenderOptions>
): void
```

### Hook-map helpers

```ts
createRangeHooksMapFromLayers<RenderOptions, Data, T, R, HC>(
    layers: PipelineLayer<RenderOptions, Data, T, R, HC>[]
): RangeHooksDefinitionMap<Data, T, R, HC>

resolveRangeHooksMap<Data, T, R, HC>(
    rangeHooksMap: RangeHooksDefinitionMap<Data, T, R, HC>,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): RangeHooksMap<Data, T, R>

resolveRangeHooksDefinition<Data, T, R, HC>(
    definition:
        RangeHooksDefinition<Data, T, R, HC> | undefined | null,
    renderHooks: Partial<RenderHooks<T, R, HC>>
): RangeHooks<Data, T, R> | null
```

Prefer renderer pipelines for application code. The low-level functions are intended for custom orchestration, renderers, debugging tools, and tests that need explicit intermediate products.

## Exported types

All declarations in `src/types.d.ts` are exported from the package root:

- Pipeline: `CreateRenderHooks`, `PipelineLayer`, `PipelineNode`
- Range sources and values: `Ranges`, `RangeIterable`, `RangeTuple`, `RangeRecord`, `RangeOrigin`, `CreateRange`, `GenerateRanges`, `GenerateRangesContext`, `RangesGenerator`, `TransformRanges`
- Generated ranges and operations: `GeneratedRange`, `RangeMarker`, `RangeOperationContext`
- Hook definitions and maps: `RangeHooksDefinition`, `RangeHooksShortcut`, `RangeHooksFactory`, `RangeHooksDefinitionMap`, `RangeHooksMap`, `RangeHooks`, `RangeCallableHook`
- Callable hooks and context: `RangeHookOpen`, `RangeHookClose`, `RangeHookWrap`, `RangeHookText`, `RangeHookReplace`, `RangeHookContext`, `RangeHookContextDump`
- Renderer contracts: `RenderHooks`, `RenderBuffer`
- Text coordinates: `LineBoundaries`

See [TypeScript](typescript.md) for common generic patterns.

## Export map

The package currently supports one public entry point, `hitext`. There are no supported public subpath exports.

| Group | Runtime exports |
|---|---|
| Renderers | `string`, `html`, `tty`, `dom`, `jsx` |
| Pipeline and rendering | `createRenderPipeline`, `createPipelineNode`, `render` |
| Range generation | `generateRangesFromLayers`, `generateRanges`, `processRanges` |
| Hook resolution | `createRangeHooksMapFromLayers`, `resolveRangeHooksMap`, `resolveRangeHooksDefinition` |
| Range sources | `rangesCompose`, `rangesConcat`, `rangesForLines`, `rangesForMatch`, `rangesFrom`, `rangesFromLayer`, `rangesFromOptions`, `rangesWithFallback` |
| Range transformers | `applyAppend`, `applyAugment`, `applyCollapseTo`, `applyDataMap`, `applyExpandTo`, `applyFallback`, `applyFilter`, `applyFitToWindow`, `applyFork`, `applyInvert`, `applyMap`, `applyMerge`, `applyPadLines`, `applyResetOrigin`, `applySort`, `applyTake` |
| Range hook utilities | `rangeHooksHide` |
| Buffers and text utilities | `StringBuffer`, `createStringBuffer`, `ArrayBuffer`, `createArrayBuffer`, `DOMBuffer`, `createDOMBuffer`, `createLineBoundaries` |

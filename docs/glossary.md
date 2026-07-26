# Glossary

## Document

The immutable input string passed to `pipeline.ranges()` or `pipeline.render()`. All range offsets address this string.

## Coordinate space

Zero-based UTF-16 string offsets relative to the document. Range ends are exclusive. Finite out-of-bounds coordinates are accepted; for example, `applyInvert(false)` may use `document.length + 1` as an omission sentinel. Output has its own structure and is not a range coordinate space.

## Range

An attributed half-open interval or boundary with `start`, `end`, optional `data`, and optional `origin`. A generated range also has a `type` carrying its layer marker.

## Point range

A zero-width range where `start === end`. Commonly used for insertion at a document or line boundary.

## Range value

One tuple `[start, end, data?, origin?]` or record `{ start, end, data?, origin? }`.

## Range iterable

An iterable collection of range values.

## Range source

The `Ranges` union accepted by a layer or transformer: a range iterable or a generator function. Built-in sources find matches, create line ranges, adapt options, or reuse prior layers.

## Range generator

A function receiving `document`, `createRange`, and optional generation context. It emits zero or more ranges for one evaluation.

## Range transformer

A curried function that receives a range source and returns a generator. Transformers filter, map, combine, or change geometry without owning rendering.

## Curried transformer

A transformer configured before it receives its range source, such as `applyExpandTo('line', 2)`. This gives transformers a uniform source-to-generator shape for composition.

## Cardinality

The relationship between input and output range counts, such as one-to-one, one-to-many, or whole-set transformation.

## Range normalization

Conversion of tuple and record input into generated records with a layer marker. Normalization does not imply sorting, merging, clamping, or validation.

## Generated range

The canonical pipeline record `{ type, start, end, data?, origin? }`. `type` is the marker of the layer that generated this record.

## Range data

Application or source metadata associated with a range, such as a regular expression match, token kind, diagnostic, or line number.

## Origin

One range or an array of ranges from which a derivative was produced. Origin records operation-specific lineage, not output positions. Each transformer defines whether it preserves existing lineage, derives from the current input, aggregates inputs, clears origin, or produces unrelated output.

## Provenance

The ability to trace a derivative through its `origin` lineage to the ranges used by earlier operations.

## Range derivative

A range produced by transforming another range. Its geometry or data may differ from its origin.

## Layer

At configuration time, a range source, range hook definition, and optional user-supplied name. Layers created by `addLayer()` always receive an assigned name and unique symbol marker. Low-level `createPipelineNode()` callers provide their own `PipelineLayer` records, where `name` is optional and marker uniqueness is their responsibility.

## Layer name

A human-readable string used by `rangesFromLayer()` and `rangesByName` to access a previously generated result.

## Layer marker

A symbol, string, or number identifying a layer's generated ranges and associating them with hooks. It is stored as `layer.marker` and copied to `generatedRange.type`. `addLayer()` creates unique symbols; low-level pipeline records may supply another `RangeMarker`.

## Analytical layer

A layer with null hooks. It generates ranges for dependencies and introspection but does not directly participate in render traversal.

## Render pipeline

An immutable ordered chain of layers plus a renderer hook factory. It can generate ranges, inspect hook maps, or materialize output.

## Render options

Per-call application values available during range generation and range operations. They can select ranges or views without changing pipeline structure.

## Generation context

Context supplied to a generator, including render options, current marker, previous results grouped by marker and name, and line boundaries. The low-level type also permits an optional `ranges` field that pipeline generation does not populate.

## Range operation context

Context supplied to transformer callbacks: document, lines, render options, stable operation input, and current index.

## Range hooks

Resolved functions and flags interpreting a layer during rendering: `open`, `close`, `wrap`, `text`, `replace`, and `break`.

## Hook definition

The value passed to `addLayer()`: a partial hook object, `wrap` shorthand, renderer-specific range hook factory, or nullish value.

## Range hook factory

A renderer-specific definition whose `createRangeHooks(rendererContext)` method produces a partial hook object, `wrap` shortcut, or nullish value during resolution.

## Hook resolution

Conversion of definitions into normalized hooks for one renderer context. Factories are invoked and missing callable hooks become null.

## Hook context

The document, position, segment, range, data, line helpers, and buffer factory passed to callable range hooks. It does not include render options.

## Segment

The portion of a generated range rendered between interruptions. Crossing ranges can split one range into several segments.

## Segmentation

The render-time process that splits crossing generated ranges into properly nested segments while retaining generated-range identity.

## Range index

A numeric identity assigned lazily during one render call. It remains the same across segments of one generated range.

## Render hooks

Renderer-level behavior: buffer creation, source text conversion, document-level open/close, and optional context for range hook factories.

## Render buffer

An accumulator with `append(child)` and `emit()`. A child buffer accumulates nested content; its emitted result is passed to `wrap`. `render()` returns the root buffer's emitted result.

## Renderer

A factory for an empty pipeline with a particular buffer and output contract. Built-in renderers are string, HTML, TTY, DOM, and JSX.

## Decoration

A rendering change that preserves all source content, such as highlighting a match.

## Projection

A derived output view that may select, omit, replace, reorder, or aggregate document content and may insert synthetic content, while annotations retain document-relative coordinates.

## Streaming transformer

In this documentation, a transformer that emits output range-by-range without first collecting its complete input. This does not imply streaming document input or streaming renderer output.

## Omitted range

A source interval selected for hiding or replacement, commonly produced by inverting visible windows.

## Line

Full line text including its trailing newline when present.

## Line content

Line text excluding the trailing newline sequence.

## `LineBoundaries`

Helpers attached to a document for converting offsets, lines, and columns and preserving `\n`, `\r\n`, or `\r` boundaries.

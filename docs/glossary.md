# Glossary

## Document

The immutable input string passed to `pipeline.ranges()` or `pipeline.render()`. All range offsets address this string.

## Coordinate space

Zero-based UTF-16 string offsets in the document. Range ends are exclusive. Output has its own structure and is not a range coordinate space.

## Range

An interval with `start`, `end`, optional `data`, and optional `origin`. A generated range also has a `type` marker.

## Point range

A zero-width range where `start === end`. Commonly used for insertion at a document or line boundary.

## Range input

An iterable of tuple or record ranges, or a generator function that emits ranges through `createRange()`.

## Range source

Any accepted range input considered as the starting point of a layer or composition. Built-in sources find matches, create line ranges, adapt options, or reuse prior layers.

## Range generator

A function receiving `document`, `createRange`, and optional generation context. It emits zero or more ranges for one evaluation.

## Range transformer

A curried function that receives range input and returns a generator. Transformers filter, map, combine, or change geometry without owning rendering.

## Range normalization

Conversion of tuple and record input into generated records with a layer marker. Normalization does not imply sorting, merging, clamping, or validation.

## Generated range

The canonical pipeline record `{ type, start, end, data?, origin? }`. `type` is the marker of the layer that generated this record.

## Range data

Application or source metadata associated with a range, such as a regular expression match, token kind, diagnostic, or line number.

## Origin

One source range or an array of source ranges from which a derivative was produced. It records lineage, not output positions.

## Range derivative

A range produced by transforming another range. Its geometry or data may differ from its origin.

## Layer

A range source, range hook definition, optional name, and unique marker. It is the unit added to a render pipeline.

## Layer name

A human-readable string used by `rangesFromLayer()` and `rangesByName` to access a previously generated result.

## Range marker

A symbol, string, or number that identifies a layer's generated ranges and associates them with hooks. Pipeline layers use unique symbols by default.

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

Functions and flags interpreting a layer during rendering: `open`, `close`, `wrap`, `text`, `replace`, and `break`.

## Hook definition

The value passed to `addLayer()`: a partial hook object, `wrap` shorthand, renderer-specific factory, or nullish value.

## Hook resolution

Conversion of definitions into normalized hooks for one renderer context. Factories are invoked and missing callable hooks become null.

## Hook context

The source, position, segment, range, data, line helpers, and buffer factory passed to callable range hooks.

## Segment

The portion of a generated range rendered between interruptions. Crossing ranges can split one range into several segments.

## Range index

A numeric identity assigned lazily during one render call. It remains the same across segments of one generated range.

## Render hooks

Renderer-level behavior: buffer creation, source text conversion, document-level open/close, and optional context for range hook factories.

## Render buffer

An accumulator with `append(child)` and `emit()`. Root and nested buffers materialize strings, nodes, child arrays, or custom results.

## Renderer

A factory for an empty pipeline with a particular buffer and output contract. Built-in renderers are string, HTML, TTY, DOM, and JSX.

## Decoration

A rendering change that preserves all source content, such as highlighting a match.

## Projection

A derived view that selects, hides, replaces, inserts, or aggregates source content while retaining source-coordinate annotations.

## Omitted range

A source interval selected for hiding or replacement, commonly produced by inverting visible windows.

## Line

Full line text including its trailing newline when present.

## Line content

Line text excluding the trailing newline sequence.

## `LineBoundaries`

Helpers attached to a document for converting offsets, lines, and columns and preserving `\n`, `\r\n`, or `\r` boundaries.

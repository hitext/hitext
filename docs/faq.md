# FAQ

## Is HiText a syntax highlighter?

No. A syntax highlighter or parser can produce ranges, and HiText can combine those ranges with search matches, diagnostics, selections, or projections. HiText does not include language grammars or assign token meaning.

## Is HiText an editor?

No. HiText renders immutable document snapshots. It does not own editing transactions, cursors, selections, input methods, incremental parsing, viewport scheduling, or undo history.

## Why not use CodeMirror or Monaco?

Use an editor when you need an editing platform. HiText addresses a smaller problem: compose stand-off annotations and document transformations into string, terminal, DOM, JSX, or custom output.

That makes it suitable for servers, build tools, CLIs, reports, static viewers, generated excerpts, and applications that already own their document model. It can also be used inside a larger viewer or editor integration.

## Can ranges overlap or cross?

Yes. Sources remain independent and may produce nested, equal, or crossing intervals. The render engine sorts them and splits crossings into render segments that can be materialized as properly nested output.

See [Rendering Model](rendering-model.md).

## What is the difference between a range and a segment?

A range is a generated annotation over the source document. A segment is the portion of that range rendered between interruption boundaries.

One range can produce several segments. In hook context, `range.start/end` describe the complete range, while `start/end` describe the current segment. `rangeIndex` remains stable across those segments.

## Why is there no public `segments()` API?

Segmentation is an internal render operation in HiText 2.0. Hooks expose segment boundaries and stable generated-range identity, but the pipeline does not return a standalone segment list.

For debugging, attach temporary hooks and record `context.dump()` as described in [Introspection and Debugging](introspection-and-debugging.md#trace-segments). Do not depend on internal stack structures.

## Can HiText render non-string output?

Yes. Built-in renderers produce strings, a DOM `DocumentFragment`, or JSX-compatible child arrays. `createRenderPipeline()` and a custom buffer can produce another result type.

## Can it generate JSON?

There is no built-in JSON renderer. A custom structured renderer can return JSON-compatible nodes, event records, annotation trees, or another application model. See [Extending HiText](extending-hitext.md#custom-structured-renderer).

## Can HiText hide or replace text?

Yes. A `replace` hook consumes a source interval and emits another value. `rangeHooksHide()` handles line-aware omissions and ellipses. Zero-width replacements insert output without consuming source text.

See [Projections and Excerpts](projections-and-excerpts.md).

## Can HiText reorder text?

It can build a derived representation by inserting generated content at a new point and replacing or hiding original regions. For example, heading data can be aggregated through origin and inserted as a table of contents.

The source document and its offsets never move. Reordering is an output projection, not mutation of the source coordinate space.

## Does HiText parse source code or Markdown?

No. Use a parser, tokenizer, regular expression source, or another analyzer to produce ranges and data. HiText composes and renders those products.

## How does HiMatch relate to HiText?

Matching and rendering are separate concerns. HiMatch can identify structured patterns and supply ranges; HiText can transform, combine, and render them with annotations from other providers. HiText does not require HiMatch.

## Does rendering change source offsets?

No. Every range addresses the original document passed to the current call. Markup, ANSI sequences, nodes, replacements, and insertions exist only in output and do not update source coordinates.

## Is rendering streaming?

No. A render call generates the current range set, resolves hooks, sorts renderable ranges, and emits a complete buffer result. Some range transformers process their input one range at a time, but that is not a streaming output API.

## Is rendering incremental?

No. Pipelines are reusable, but generated ranges and output are recomputed for each call. Applications can cache analyzer results and provide updated ranges when they own invalidation after document edits.

## Can I use only the core?

Low-level generation, hook-resolution, rendering, buffer, and line-boundary functions are public exports. The package currently has one public entry point rather than separate core subpackages. ESM bundlers may remove unused exports according to their tree-shaking behavior.

## Why are pipelines immutable?

Immutability makes construction order explicit and lets configured prefixes feed several derived pipelines without mutation at a distance. It does not mean render results are cached; each call creates fresh generation and renderer state.

## What is `origin` for?

Origin records which source range or ranges produced a derivative. It supports tracing, grouping, summaries, merged windows, and generated structures such as a table of contents.

Origin is optional and operation-specific. Data mapping and explicit reset can clear it; inversion creates gaps with no direct source origin. See [Range Functions Guide](range-functions-guide.md#work-with-provenance).

## What happens when no ranges match?

The pipeline renders the document normally unless another layer says otherwise. `applyInvert()` returns no ranges for empty input rather than treating the complete document as omitted. Use a fallback source when an empty result needs special behavior.

## Is HTML output safe for untrusted data?

The HTML renderer escapes source document chunks. It does not escape values returned by hooks. Validate or escape range data before interpolating it into tags, attributes, or generated markup.

## Can a layer generate ranges without rendering them?

Yes. Pass `null` as the hook definition. The layer's ranges remain available to later named dependencies and `pipeline.ranges()`, but they are omitted from render traversal.

## Can later layers refer to earlier ones?

Yes, through `rangesFromLayer(name)` or generation context maps. Dependencies are ordered: a layer cannot access a result that has not been generated yet. Use unique names when layers are dependency targets.

## Where should I start?

Read [Getting Started](getting-started.md), then [Core Concepts](core-concepts.md). Use [Range Functions Guide](range-functions-guide.md) for composition, [Recipes](recipes.md) for complete examples, and [API Reference](api-reference.md) for exact surface lookup.

# Performance

HiText separates range generation, transformation, render planning, and output materialization. Performance work should identify which stage dominates for a particular document and renderer rather than treating a pipeline as one opaque operation.

This page describes the current cost model. It does not promise incremental or streaming behavior.

## Cost factors

The main inputs are:

- document length;
- number of layers;
- work performed by each range source;
- number of generated ranges;
- transformations that collect or sort complete inputs;
- overlap density and number of render segments;
- number and cost of hooks;
- allocation cost of the output renderer.

A long document with ten literal ranges can be cheaper than a short document scanned by many patterns. A large non-overlapping range set can be cheaper to render than a smaller set with dense crossings and `wrap` buffers.

## Generation and rendering

`pipeline.render()` performs both major phases:

```text
range generation and transformation
    -> hook resolution
    -> filtering and sorting
    -> segmentation and hook execution
    -> buffer emission
```

Use `pipeline.ranges(document, options)` to measure generation separately. To isolate rendering in a benchmark, use the low-level `render()` API with a previously generated range set and the appropriate definitions and renderer hooks.

Do not reuse generated ranges with a different source document unless their offsets and data are valid in that document's coordinate space.

## Range generation

Source cost belongs to the source:

- a static iterable is proportional to the number of supplied ranges;
- `rangesForMatch()` scans according to JavaScript string or regular expression behavior;
- a parser-backed source inherits parser cost;
- `rangesFromLayer()` copies previously generated layer ranges into the new layer result rather than rescanning the document.

Each pipeline layer generates a normalized array and the pipeline concatenates layer results. Named dependencies avoid repeated analysis but still create generated records for the dependent layer.

## Transformer allocation

Some transformers can emit ranges one by one. Others require a stable complete input:

- expansion, collapse, and origin reset can operate per range;
- callbacks that expose `context.ranges` collect input for stable context;
- sorting, merging, inversion, taking, line padding, and window logic use temporary arrays or global input knowledge;
- forks and appended sources evaluate additional branches.

The [Range Functions Reference](range-functions-reference.md#quick-reference) identifies streaming implementations and operations that collect temporary arrays.

Here, streaming means processing a transformer's input incrementally within one render call. It does not mean that the complete HiText output is a network or file stream.

## Render planning

Let $R$ be the number of generated ranges with resolved hooks. The render engine filters and sorts a copy of those ranges. Sorting costs $O(R \log R)$ under the usual comparison-sort model.

Traversal cost depends on overlap structure as well as $R$. Crossing ranges may close and reopen, producing more hook calls and nested buffers than the number of generated ranges alone suggests. Segment-end calculation may inspect upcoming ranges, so HiText does not claim a strict linear bound for arbitrary dense overlap patterns.

Measure with representative geometry: nested, crossing, equal-boundary, and replacement-heavy inputs exercise different paths.

## Renderer allocation

Renderer output changes the allocation profile:

- string, HTML, and TTY buffers accumulate string parts;
- `wrap` introduces a nested buffer for each rendered segment;
- DOM output allocates text nodes, elements supplied by hooks, and fragments;
- JSX output allocates arrays plus elements supplied by the caller;
- a structured renderer controls its own node and collection strategy.

HTML escaping scans every source chunk. TTY output also tracks and emits foreground and background transitions. DOM and JSX usually allocate more objects than string output.

## Reuse pipelines

Construct stable pipelines once and render multiple documents or option sets:

```js
const report = createReportPipeline();

report.render(firstDocument, compactOptions);
report.render(secondDocument, compactOptions);
report.render(secondDocument, fullOptions);
```

This reuses layer definitions and configured sources. It does not cache generated ranges or renderer state: every `render()` call creates line boundaries, generates current ranges, resolves a fresh renderer context, and creates new buffers.

If document analysis is expensive and unchanged, compute application-owned ranges outside HiText and pass them as static input or render options. The application is then responsible for invalidating them when the document changes.

## Large documents

For large inputs:

1. Avoid scanning the document independently in many custom sources when one analyzer can emit categorized data.
2. Put shared analysis in a named layer and derive later ranges from it.
3. Filter or rank ranges before expensive geometry and output hooks.
4. Use projections to materialize only relevant context when the consumer does not need the full document.
5. Prefer string output when object trees are unnecessary.
6. Keep hook work local and avoid slicing or parsing the full document on every segment call.

Viewport and excerpt pipelines reduce output allocation, but their sources may still analyze the complete document. They are not an incremental editor viewport.

## Output budgets

HiText provides the mechanics for budget-aware output: rank source ranges, expand context, merge windows, fit horizontal ranges, invert retained intervals, and render omission metadata.

It does not include a general optimizer for character, line, token, or relevance budgets. Implement selection policy in an application source or transformer, then use ordinary HiText composition to materialize the chosen view.

## Bundle size

HiText has no runtime dependencies and exposes ESM entry points suitable for tree shaking. Actual application size depends on the imports, bundler, target, minifier, and compression method.

Measure release artifacts with a reproducible command and report both raw and compressed sizes. For example:

```bash
npm run build
wc -c dist/*
gzip -c dist/hitext.min.js | wc -c
```

Adjust filenames to the build output. Do not compare a minified, compressed HiText subset with an uncompressed full editor distribution.

## Benchmarking

A useful benchmark matrix varies one factor at a time:

- document length with a fixed range count;
- range count with fixed document length;
- nested versus crossing overlap;
- ordinary versus replacement ranges;
- `open`/`close` versus `wrap`;
- string, HTML, TTY, DOM, and JSX output;
- generation alone versus complete rendering;
- memory and output size as well as elapsed time.

Warm-up, runtime version, platform, renderer environment, pattern complexity, and output consumption should be recorded with results.

## Non-guarantees

HiText 2.0 does not currently provide:

- incremental updates after document edits;
- cached layer results across render calls;
- asynchronous or streaming generators;
- streaming output finalization;
- built-in worker scheduling;
- a universal output-budget optimizer.

These can be handled around HiText when an application owns invalidation, scheduling, or selection policy.

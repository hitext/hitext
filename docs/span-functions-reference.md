# Span Functions Reference

Complete API reference for span functions, including signatures, parameters, return types, use cases, and examples.

See [Span Functions Guidelines](span-functions-guidelines.md) for implementation requirements, design principles, and procedures.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Span Sources](#span-sources)
- [Span Transformers](#span-transformers)

## Quick Reference

Span Sources:

| Function | Type | Description | Origin Behavior |
|----------|------|-------------|-----------------|
| [`spansCompose`](#spanscomposespaninput-transformers) | Composer | Pipeline composition | Per transformer |
| [`spansConcat`](#spansconcatinputs) | Combiner | Combine sources | Preserves existing |
| [`spansFromLines`](#spansfromlinestype) | Source | Line boundaries | None (new spans) |
| [`spansFromMatch`](#spansfrommatchpattern) | Source | Pattern matching | None (new spans) |
| [`spansFrom`](#spansfrominput) | Source | Raw data conversion & document keywords | None (new spans) |
| [`spansFromLayer`](#spansfromlayername) | Source | Layer reference | Preserves existing |
| [`spansFromOptions`](#spansfromoptionskey) | Source | User options | Preserves existing |
| [`spansWithFallback`](#spanswithfallbackinputs) | Combiner | First non-empty | Preserves existing |

Span Transformers:

| Function | Transform Type | Description | Modifies Data | Origin | Implementation |
|----------|----------------|-------------|---------------|--------|----------------|
| [`applyAppend`](#applyappendsources) | N-to-N | Append sources | No | Preserves | Wrapper |
| [`applyAugment`](#applyaugmentcallback) | 1-to-N | Add derivatives | No | Creates new | Temp array* |
| [`applyCollapseTo`](#applycollapsetoposition) | 1-to-1 | Zero-width markers | No | Inherits | Streaming |
| [`applyDataMap`](#applydatamapmapper) | 1-to-1 | Data transformation | Yes | Cleared | Temp array* |
| [`applyExpandTo`](#applyexpandtoposition-lines) | 1-to-1 | Expand boundaries | No | Inherits | Streaming |
| [`applyFallback`](#applyfallbackfallbacks) | N-to-N | Provide fallback | No | From source | Wrapper |
| [`applyFilter`](#applyfilterpredicate) | N-to-N | Conditional selection | No | Inherits | Temp array* |
| [`applyFitToWindow`](#applyfittowindowsize-allowtrimming) | 1-to-1 | Horizontal viewport | No | Inherits | Streaming |
| [`applyFork`](#applyforktransformers) | N-to-N | Fork sub-pipeline | No | Preserves | Wrapper |
| [`applyInvert`](#applyinvertexact) | N-to-M | Negate spans | No | None | Temp array |
| [`applyMap`](#applymapcallback) | 1-to-N | Transform spans | No | Creates new | Temp array* |
| [`applyMerge`](#applymerge) | N-to-1 | Merge overlapping | No | Array of merged | Temp array |
| [`applyPadLines`](#applypadlineslines-size) | 1-to-N | Add padding | No | Inherits | Temp array |
| [`applyResetOrigin`](#applyresetorigin) | 1-to-1 | Clear origins | No | Cleared | Streaming |
| [`applySort`](#applysortcomparator) | N-to-N | Custom ordering | No | Inherits | Temp array* |
| [`applyTake`](#applytaken-predicate) | N-to-N | Take first/last N + filter | No | Inherits | Temp array |

**Implementation notes:**
- **Streaming** - Processes spans one-by-one without collecting in memory (1-to-1 transforms)
- **Temp array*** - Required for predicate callbacks to provide stable `context.spans` parameter
- **Temp array** - Required for complex logic (merging, inverting, windowing, padding)
- **Wrapper** - Delegates to other span functions (composition helper)

**Transform types:**
- **1-to-1** - Each input span produces exactly one output span
- **1-to-N** - Each input span may produce multiple output spans
- **N-to-1** - Multiple input spans combined into one output span
- **N-to-N** - Variable number of output spans (filtering, windowing)
- **N-to-M** - Complete transformation (inversion)

**Origin behavior:**
- **Inherits** - Passes through existing origin, or creates new from input span
- **Array of merged** - Creates array of all merged spans (enables access to individuals)
- **None** - No relationship between input and output (inversions)
- **Cleared** - Sets to `undefined` (data transformations create new semantic meaning)
- **Preserves existing** - Keeps whatever origin was in source spans

Origin records expose `data` as `unknown`, since data-changing transformers may preserve a root with a different data type.

---

## Span Sources

### `spansCompose(spanInput, ...transformers)`

Compose a span generator with multiple transformers (left-to-right).

```typescript
spansCompose<InputData, OutputData, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    ...transformers: Array<TransformSpans>
): GenerateSpans<OutputData, RenderOptions>
```

**Parameters:**
- `spanInput` - Initial span generator
- `transformers` - Transformation functions to apply in sequence

**Use cases:**
- Building transformation pipelines
- Combining multiple transformations
- Creating reusable compositions

**Example:**
```typescript
// Multi-step pipeline
spansCompose(
    spansFromLayer('diagnostics'),
    applyFilter(span => span.data.severity === 'error'),
    applyExpandTo('line', 2),
    applyMerge(),
    applyFitToWindow(1000)
)
```

---
### `spansConcat(...inputs)`

Combine multiple span sources into a flat list without merging.

```typescript
spansConcat<Data, RenderOptions>(
    ...inputs: Array<SpansSource<Data, RenderOptions>>
): GenerateSpans<Data, RenderOptions>
```

**Parameters:**
- `inputs` - One or more span sources to combine

**Use cases:**
- Multi-pattern matching
- Combining different source types
- Layer aggregation

**Example:**
```typescript
// Collect multiple severity levels
spansConcat(
    spansFromMatch(/ERROR/g),
    spansFromMatch(/WARNING/g),
    spansFromLayer('diagnostics')
)
```

---

### `spansFromLines(type?)`

Generate spans for line boundaries in various formats.

```typescript
spansFromLines(
    type?: 'line' | 'line-content' | 'newline' | 'line-start' | 'line-end' | 'line-content-end'
): GenerateSpans<number, RenderOptions>
```

**Parameters:**
- `type` - Line boundary type:
  - `'line'` (default) - Full lines including newlines
  - `'line-content'` - Line content excluding newlines
  - `'newline'` - Only newline characters
  - `'line-start'` - Zero-width markers at line starts
  - `'line-end'` - Zero-width markers at line ends (after newline)
  - `'line-content-end'` - Zero-width markers at line content end (before newline)

**Data:** Line number (1-indexed)

**Use cases:**
- Line numbering
- Line-based highlighting
- Inserting line prefixes/suffixes
- Git diff styling

**Example:**
```typescript
// Add line numbers
spansFromLines('line-start')

// Highlight full lines
spansFromLines('line')
```

---

### `spansFromMatch(pattern)`

Find all occurrences matching a string or regular expression.

```typescript
spansFromMatch(pattern: RegExp): GenerateSpans<RegExpExecArray, RenderOptions>
spansFromMatch(pattern: string): GenerateSpans<string, RenderOptions>
```

**Parameters:**
- `pattern` - RegExp (with `g` flag) or string to match

**Data:** Full `RegExpExecArray` (includes capture groups) for RegExp, matched string for string literal

**Matching behavior:**
- Zero-width matches produce point spans. Repeated RegExp matches advance by code point in Unicode mode and by code unit otherwise.
- An empty string matches every document offset, including the end offset.
- Each generation uses a fresh copy of the RegExp starting at `lastIndex = 0`; the supplied RegExp is not mutated.

**Use cases:**
- Syntax highlighting
- Finding diagnostic markers
- Extracting structured patterns

**Example:**
```typescript
// Find function declarations with capture groups
spansFromMatch(/function\s+(\w+)/gi)

// Simple string matching
spansFromMatch('TODO')
```

---

### `spansFrom(input)`

Convert raw span data or document keywords into `GenerateSpans` function.

```typescript
spansFrom<Data>(
    input: 'document' | 'document-start' | 'document-end' | 
           SpansIterable<Data> | 
           SpansSourceFactory<Data, RenderOptions>
): GenerateSpans<Data, RenderOptions>
```

**Parameters:**
- `input` - One of:
  - `'document'` - Full document span `[0, document.length]`
  - `'document-start'` - Zero-length span at position 0
  - `'document-end'` - Zero-length span at `document.length`
  - Iterable of tuples `[start, end, data?]` or objects `{start, end, data?}`
  - Generator function `(document, renderOptions?) => SpansSource`

**Data:** `undefined` for document keywords, otherwise preserves input data

**Use cases:**
- Document-level operations (wrap entire content, document boundaries)
- Integrating external tools (linters, parsers)
- Converting custom formats
- Testing with fixtures
- Dynamic span generation based on document

**Example:**
```typescript
// Full document span
spansFrom('document')

// Document boundary insertion point
spansFrom('document-start')

// From external linter
const diagnostics = await linter.lint(document);
spansFrom(diagnostics)

// From tuple array
spansFrom([[0, 5], [10, 15]])

// From generator function
spansFrom((document) => document.length > 100 ? [[0, 100]] : [])
```

---

### `spansFromLayer(name)`

Reference spans from another pipeline layer by name.

```typescript
spansFromLayer<Data>(name: string): GenerateSpans<Data, RenderOptions>
```

**Parameters:**
- `name` - Layer name to reference

**Use cases:**
- Building dependent layers
- Applying different styles to same spans
- Cross-layer filtering

**Example:**
```typescript
// Use diagnostics from another layer
spansFromLayer('diagnostics')
```

---

### `spansFromOptions(spanInput)`

Get spans from render options (user-configurable).

```typescript
spansFromOptions<Data>(
    spanInput: ((renderOptions: RenderOptions) => SpansSource<Data, RenderOptions> | null | undefined) | keyof RenderOptions
): GenerateSpans<Data, RenderOptions>
```

**Parameters:**
- `spanInput` - Either a callback function that receives render options and returns spans, or a field name (shortcut for accessing a property)

**Use cases:**
- User-configurable highlighting
- Editor selections
- Custom span inputs
- Conditional span generation

**Example:**
```typescript
// Using field name shortcut
spansFromOptions('tocInsertPoint')

// Using callback for conditional logic
spansFromOptions(({ pattern }) => pattern && spansFromMatch(pattern))
```

---

### `spansWithFallback(...inputs)`

Try multiple span sources in order, return first non-empty result.

```typescript
spansWithFallback<Data, RenderOptions>(
    ...inputs: SpansSource<Data, RenderOptions>[]
): GenerateSpans<Data, RenderOptions>
```

**Parameters:**
- `inputs` - Span sources to try in order

**Use cases:**
- Graceful degradation
- Default values when no matches
- Progressive pattern matching

**Example:**
```typescript
// Find best insertion point with fallbacks
spansWithFallback(
    spansFromOptions('userInsertPoint'),
    spansFromMatch(/<!-- TOC -->/),
    spansFrom('document-start')
)
```

---

## Span Transformers

### `applyAppend(...sources)`

Append independent span sources mid-pipeline.

```typescript
applyAppend<Data, RenderOptions>(
    ...sources: Array<SpansSource<Data, RenderOptions>>
): TransformSpans<Data, RenderOptions>
```

**Parameters:**
- `sources` - Span sources to append (iterables, generators, keywords)

**Origin:** Preserves existing origins from all sources

**Use cases:**
- Add document boundary markers
- Add line numbers for all lines
- Combine pipeline output with independent spans

**Example:**
```typescript
// Pass through matched errors, append document boundaries
spansCompose(
    spansFromMatch(/error/g),
    applyAppend(
        spansFrom('document-start'),
        spansFrom('document-end')
    )
)
```

---

### `applyAugment(callback)`

Pass through original spans unchanged, add derived spans.

```typescript
applyAugment<Data, RenderOptions, AdditionalData = Data>(
    callback: (
        span: SpanRecord<Data>,
        createSpan: CreateSpan<AdditionalData>,
        context: SpanOperationContext<Data, RenderOptions>
    ) => void
): TransformSpans<Data, RenderOptions, Data | AdditionalData>
```

**Parameters:**
- `callback` - Function that creates additional spans via `createSpan(start, end, data?)`
  - `span` - Current input span (passed through unchanged)
  - `createSpan` - Function to create derivative spans
  - `context` - Operation context with `{ document, lines, renderOptions, spans, index }`

**Origin:** Original span keeps its origin unchanged, derivatives get automatic origin tracking

**Use cases:**
- Add line-start markers for diagnostics
- Add margin decorations while preserving original spans
- Create visual guides alongside content spans

**Example:**
```typescript
// Pass through errors, add line-start marker for each
spansCompose(
    spansFromOptions('diagnostics'),
    applyAugment((span, createSpan, { lines }) => {
        const lineStart = lines.getLineStart(span.start);
        createSpan(lineStart, lineStart, { type: 'error-marker' });
    })
)
```

---

### `applyCollapseTo(position)`

Collapse spans to zero-width markers at specific positions.

```typescript
applyCollapseTo(
    position: 'start' | 'end' | 
              'line-start' | 'line-end' | 'line-content-end' |
              'document-start' | 'document-end'
): TransformSpans
```

**Parameters:**
- `position` - Target position:
  - `'start'` - Beginning of span
  - `'end'` - End of span
  - `'line-start'` - Start of line containing span start
  - `'line-end'` - End of line containing span end (after newline)
  - `'line-content-end'` - End of line content (before newline)
  - `'document-start'` - Start of document (0)
  - `'document-end'` - End of document (`document.length`)

**Origin:** Inherits from input span (direct connection)

**Use cases:**
- Creating insertion points
- Line/document markers
- Icon/decoration placement

**Example:**
```typescript
// Insert markers at match start
spansCompose(
    spansFromMatch(/error/g),
    applyCollapseTo('start')
)
```

---

### `applyDataMap(mapper)`

Transform span data while preserving positions. **Clears `origin` tracking** (data transformation creates new semantic meaning).

```typescript
applyDataMap<Data, NewData, RenderOptions>(
    mapper: (
        span: SpanRecord<Data>,
        context: SpanOperationContext<Data, RenderOptions>
    ) => NewData
): TransformSpans<Data, RenderOptions, NewData>
```

**Parameters:**
- `mapper` - Transformation function receiving:
  - `span` - Full span object
  - `index` - Zero-based position
  - `context` - Operation context

**Origin:** Cleared (`undefined`) - new semantic meaning

**Use cases:**
- Adding computed properties
- Enriching external data
- Normalizing data formats

**Example:**
```typescript
// Parse match data
spansCompose(
    spansFromMatch(/(\w+)=(\w+)/g),
    applyDataMap(span => {
        const [, key, value] = span.data;
        return { key, value };
    })
)

// Add sequential IDs
spansCompose(
    spans,
    applyDataMap((span, index) => ({
        ...span.data,
        id: `item-${index}`
    }))
)
```

---

### `applyExpandTo(position, lines?)`

Expand spans to broader boundaries with optional context lines.

```typescript
applyExpandTo(
    position: 'line' | 'line-content' | 'line-start' | 'line-end' | 'line-content-end' | 
              'document' | 'document-start' | 'document-end',
    lines?: number | [before: number, after: number]
): TransformSpans
```

**Parameters:**
- `position` - Target boundary type (see `applyCollapseTo` for position descriptions)
- `lines` - Context lines to include:
  - Number: same count before and after (e.g., `2` = 2 before, 2 after)
  - Tuple: `[before, after]` for asymmetric context (e.g., `[1, 3]`)

**Origin:** Inherits from input span (direct connection)

**Use cases:**
- Context highlighting
- Code block expansion
- Snippet extraction with context

**Example:**
```typescript
// Expand to full lines with 2 lines context
spansCompose(
    spansFromMatch(/error/g),
    applyExpandTo('line', 2)
)

// Asymmetric context: show function body
spansCompose(
    spansFromMatch(/^function/gm),
    applyExpandTo('line', [0, 5])
)
```

---

### `applyFallback(...fallbacks)`

Provides fallback spans when input produces no results (curried transformer).

```typescript
applyFallback<Data, RenderOptions>(
    ...fallbacks: SpansSource<Data, RenderOptions>[]
): TransformSpans<Data, RenderOptions>
```

**Parameters:**
- `fallbacks` - Fallback span sources to try in order if input is empty

**Origin:** Depends on which source provides spans (input or fallback)

**Use cases:**
- Graceful degradation
- Default values when primary source is empty
- Ensuring non-empty results

**Example:**
```typescript
// Show errors, or warnings if no errors
spansCompose(
    spansFromMatch(/error/gi),
    applyFallback(
        spansFromMatch(/warning/gi),
        [[0, 100]]  // Show first 100 chars if nothing found
    )
)

// Insert TOC with fallback positions
spansCompose(
    spansFromOptions('tocInsertPoint'),
    applyFallback(
        spansFromMatch(/^(?=#[^#])/m),  // Before first H1
        [[0, 0]]  // Document start
    )
)
```
### `applyFilter(predicate)`

Filter spans using a predicate function.

```typescript
applyFilter(
    predicate: (span, index, context) => boolean
): TransformSpans
```

**Parameters:**
- `predicate` - Function receiving:
  - `span` - Full span object `{start, end, data, origin}`
  - `index` - Zero-based position in sequence
  - `context` - `{document, lines, renderOptions, spans}`

**Origin:** Inherits from input span (direct connection)

**Use cases:**
- Conditional highlighting
- Severity filtering
- Position-based selection

**Example:**
```typescript
// Filter single-line spans only
spansCompose(
    spansFromMatch(/\w+/g),
    applyFilter((span, i, { lines }) =>
        lines.getLine(span.start) === lines.getLine(span.end)
    )
)

// Filter by data property
spansCompose(
    diagnostics,
    applyFilter(span => span.data.severity === 'error')
)
```

---

### `applyFitToWindow(size?, allowTrimming?)`

Fit spans within a size constraint (viewport).

```typescript
applyFitToWindow(
    size?: number,
    allowTrimming?: boolean
): TransformSpans
```

**Parameters:**
- `size` - Maximum window width in characters (default: `80`)
- `allowTrimming` - Allow trimming spans to fit (default: `true`)

**Origin:** Inherits from input span (direct connection)

**Use cases:**
- Preview generation
- Horizontal viewport fitting
- Performance optimization

**Example:**
```typescript
// Fit into 80-char window (default)
spansCompose(
    spansFromMatch(/error/g),
    applyFitToWindow()
)

// Custom size with no trimming
spansCompose(
    spansFromMatch(/error/g),
    applyFitToWindow(120, false)
)
```

---

### `applyFork(...transformers)`

Fork the pipeline: pass through originals, apply sub-pipeline, append transformed copies.

```typescript
applyFork<Data, OutputData, RenderOptions>(
    ...transformers: Array<TransformSpans>
): TransformSpans<Data, RenderOptions, Data | OutputData>
```

**Parameters:**
- `transformers` - Sub-pipeline transformers to apply to input spans

**Origin:** Preserves existing origins from all sources (originals unchanged, transformed copies follow their transformer semantics)

**Use cases:**
- Add derivative spans alongside originals (markers, icons, decorations)
- Show content + metadata (diagnostics + gutter icons)
- Parallel transformations (matches + line indicators)
- Pipeline branching for multi-purpose output

**Example:**
```typescript
// Show error matches + line-start markers
spansCompose(
    spansFromMatch(/error/g),
    applyFork(
        applyCollapseTo('line-start'),
        applyDataMap(() => ({ type: 'marker' }))
    )
)
```

---

### `applyInvert(exact?)`

Invert spans - returns everything NOT in input spans. **Output spans have no origin** (no direct connection to input).

```typescript
applyInvert(exact?: boolean): TransformSpans
```

**Parameters:**
- `exact` - Boundary behavior:
  - `true` - Bound to `[0, document.length]`
  - `false` (default) - Extend to `[0, document.length + 1]`

**Origin:** None (no connection between input and output)

**Use cases:**
- Creating viewport gaps
- Collapsible content
- Negative highlighting

**Example:**
```typescript
// Create gaps between headers for collapsing
spansCompose(
    spansFromMatch(/^#{1,6}\s/gm),
    applyExpandTo('line'),
    applyInvert()
)
```

---

### `applyMap(callback)`

Core 1-to-N primitive for span transformation. Creates derivative spans with automatic origin tracking.

```typescript
applyMap<InputData, OutputData, RenderOptions>(
    callback: (
        span: SpanRecord<InputData>,
        createSpan: CreateSpan<OutputData>,
        context: SpanOperationContext<InputData, RenderOptions>
    ) => void
): TransformSpans<InputData, RenderOptions, OutputData>
```

**Parameters:**
- `callback` - Function that creates output spans via `createSpan(start, end, data?)`
  - `span` - Current input span
  - `createSpan` - Function to create derivative spans
  - `context` - Operation context with `{ document, lines, renderOptions, spans, index }`

**Origin:** Automatically tracks to input span (preserves transformation lineage)

**Use cases:**
- Split matched lines into words
- Extract regex capture groups
- Transform one span into multiple derivatives
- Custom span decomposition

**Example:**
```typescript
// Split lines into words
spansCompose(
    spansFromMatch(/(?:(\w+) )?(ERROR|WARNING|INFO)/g),
    applyMap((span, createSpan, { document }) => {
        const prefix = span.data[1]; // optional prefix
        let labelStart = span.start;
        if (prefix !== undefined) {
            createSpan(span.start, span.start + prefix.length, 'prefix');  // opening prefix
            labelStart += prefix.length + 1; // +1 for space
        }
        createSpan(labelStart, span.end, span.data[2]); // label
   })
)
```

---

### `applyMerge()`

Merge overlapping or adjacent spans into continuous regions. **Always preserves merged spans in `origin` field as an array.**

```typescript
applyMerge(): TransformSpans
```

**Origin:** Array of merged spans (enables access to individual items)

**Use cases:**
- Combining overlapping highlights
- Deduplicating spans
- Continuous region extraction
- Generating summaries from merged items

**Example:**
```typescript
// Merge with access to individual headers via origin
spansCompose(
    spansFromMatch(/^#{1,6}\s+(.+)$/gm),
    applyDataMap(match => ({
        level: match[1].length,
        text: match[2]
    })),
    applyCollapseTo('document-start'),
    applyMerge()  // origin contains all headers
)
// In render: span.origin.map(({ data }) => ...)
```

---

### `applyPadLines(lines, size)`

Add padding spans around lines.

```typescript
applyPadLines<Data, RenderOptions>(
    lines: number | [before: number, after: number],
    size: number
): TransformSpans<Data, RenderOptions, number>
```

**Parameters:**
- `lines` - Padding line count:
  - Number: lines after only (e.g., `2` = 0 before, 2 after)
  - Tuple: `[before, after]` for explicit control (e.g., `[1, 2]`)
- `size` - Target width for each padding line in characters

**Origin:** Inherits from input span (direct connection)

**Use cases:**
- Smart spacing
- Visual separation
- Context preservation

**Example:**
```typescript
// Add 2 lines after each span
spansCompose(
    spansFromLines('line-content'),
    applyPadLines(2, 50)
)

// Add 1 before and 2 after
spansCompose(
    spansFromLines('line-content'),
    applyPadLines([1, 2], 50)
)
```

---

### `applyResetOrigin()`

Clear origin tracking from spans.

```typescript
applyResetOrigin(): TransformSpans
```

**Origin:** Cleared (`undefined`)

**Use cases:**
- Clean up transformation history
- Prevent origin bloat
- Fresh transformation chains

**Example:**
```typescript
// Clear origins after complex transformations
spansCompose(
    spans,
    applyExpandTo('line'),
    applyMerge(),
    applyResetOrigin()
)
```

---

### `applySort(comparator?)`

Sort spans by custom criteria.

```typescript
applySort(
    comparator?: (spanA, spanB, context) => number
): TransformSpans
```

**Parameters:**
- `comparator` - Comparison function (optional):
  - Receives `spanA`, `spanB`, `context`
  - Returns negative (A before B), zero (equal), or positive (B before A)
  - Default: sort by start ascending, then end descending

**Origin:** Inherits from input span (direct connection)

**Use cases:**
- Rendering order control
- Priority sorting
- Chronological ordering

**Example:**
```typescript
// Default sort
spansCompose(spans, applySort())

// Sort by line number
spansCompose(
    spans,
    applySort((a, b, { lines }) =>
        lines.getLine(a.start) - lines.getLine(b.start)
    )
)
```

---

### `applyTake(n, predicate?)`

Take first or last N spans with optional filtering. Combines positional limiting with filtering
for efficient selection - evaluates spans in order and stops when limit is reached.

```typescript
applyTake(
    n: number | 'first' | 'last',
    predicate?: (span, opContext) => boolean
): TransformSpans
```

**Parameters:**
- `n` - Number of spans to take:
  - Positive number - Take first N spans (that match predicate if provided)
  - Negative number - Take last N spans (that match predicate if provided)
  - `'first'` - Take first span (equivalent to `1`)
  - `'last'` - Take last span (equivalent to `-1`)
- `predicate` - Optional filter function (same signature as `applyFilter`):
  - `span` - Full span object
  - `opContext` - Context with `{ document, lines, renderOptions, spans, index }`

**Origin:** Inherits from input spans (direct connection)

**Use cases:**
- Pagination (first/last page of results)
- Limiting output with filtering (top 10 errors, not just any 10 spans)
- Quick preview (first match only)
- Efficient selection (stops early when limit reached)

**Example:**
```typescript
// Take first 10 matches
spansCompose(
    spansFromMatch(/error/g),
    applyTake(10)
)

// Take last 5 matches
spansCompose(
    spansFromMatch(/error/g),
    applyTake(-5)
)

// First error
spansCompose(
    ...,
    applyTake('first', span => span.data.severity === 'error')
)
```

---

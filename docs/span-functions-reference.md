# Span Functions Reference

Public API reference for creating and transforming spans. Offsets are zero-based, end-exclusive UTF-16 code-unit positions, matching JavaScript string indexing.

See [Span Functions Guidelines](span-functions-guidelines.md) for implementation requirements, design principles, and procedures.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Example Data Types](#example-data-types)
- [Span Sources](#span-sources)
- [Span Transformers](#span-transformers)

## Quick Reference

Span Sources:

| Function | Type | Description | Evaluation |
| --- | --- | --- | --- |
| [`spansCompose`](#spanscomposespaninput-transformers) | Composer | Apply transformers left to right | Per transformer |
| [`spansConcat`](#spansconcatinputs) | Combiner | Emit every source in argument order | Sequential |
| [`spansFromLines`](#spansfromlinestype) | Source | Generate line-boundary spans | Direct |
| [`spansFromMatch`](#spansfrommatchpattern) | Source | Generate string or RegExp matches | Direct |
| [`spansFrom`](#spansfrominput) | Source | Normalize span inputs and document keywords | Direct |
| [`spansFromLayer`](#spansfromlayername) | Source | Read a previously generated named layer | Context lookup |
| [`spansFromOptions`](#spansfromoptionsspaninput) | Source | Resolve a source from render options | Deferred |
| [`spansWithFallback`](#spanswithfallbackinputs) | Combiner | Emit the first non-empty source | Sequential fallback |

Span Transformers:

| Function | Cardinality | Description | Data | Origin | Evaluation |
| --- | --- | --- | --- | --- | --- |
| [`applyAppend`](#applyappendsources) | N-to-M | Append independent sources | Preserved | Preserved | Sequential |
| [`applyAugment`](#applyaugmentcallback) | 1-to-many | Pass through inputs and add derivatives | Union | Preserve/derive | Complete input |
| [`applyCollapseTo`](#applycollapsetoposition) | 1-to-1 | Collapse to point spans | Preserved | Derive | Streaming |
| [`applyDataMap`](#applydatamapmapper) | 1-to-1 | Replace data | Replaced | Clear | Complete input |
| [`applyExpandTo`](#applyexpandtoposition-lines) | 1-to-1 | Expand boundaries | Preserved | Derive | Streaming |
| [`applyFallback`](#applyfallbackfallbacks) | N-to-M | Use fallbacks for empty input | Preserved | Preserved | Sequential fallback |
| [`applyFilter`](#applyfilterpredicate) | N-to-M | Select by predicate | Preserved | Preserved | Complete input |
| [`applyFitToWindow`](#applyfittowindowsize-allowtrimming) | 1-to-1 | Fit horizontal windows | Preserved | Derive | Streaming |
| [`applyFork`](#applyforktransformers) | N-to-M | Emit inputs plus a transformed branch | Union | Per branch | Complete input once |
| [`applyInvert`](#applyinvertexact) | N-to-M | Emit gaps between covered regions | `undefined` | None | Complete input |
| [`applyMap`](#applymapcallback) | 1-to-many | Emit custom derivatives | Replaced | Derive | Complete input |
| [`applyMerge`](#applymerge) | N-to-M | Merge contiguous groups | `undefined` | Merge array | Complete input/sorted |
| [`applyPadLines`](#applypadlineslines-size) | 1-to-many | Emit selected line-width spans | Missing width | Derive | Complete input |
| [`applyResetOrigin`](#applyresetorigin) | 1-to-1 | Clear roots | Preserved | Clear | Streaming |
| [`applySort`](#applysortcomparator) | N-to-N | Reorder spans | Preserved | Preserved | Complete input |
| [`applyTake`](#applytaken-predicate) | N-to-M | Select first or last matches | Preserved | Preserved | Complete input |

**Cardinality:**

- **1-to-1** - Every input span produces exactly one output span.
- **1-to-many** - Every input span may produce zero, one, or multiple output spans.
- **N-to-N** - The complete input set is reordered without changing its size.
- **N-to-M** - The number of outputs depends on the complete input set or additional sources.

**Data:**

- **Preserved** - Output spans retain input data unchanged.
- **Replaced** - A callback produces a new output data type.
- **Union** - Output may contain original data and data produced by a branch or callback.
- **Missing width** - Output data is the number of UTF-16 code units missing from the requested line width.
- **`undefined`** - The operation creates regions that do not have one meaningful input data value.

**Origin:**

- **Preserved** - Passes through the existing origin unchanged.
- **Derive** - Preserves an existing root, or records the input span as the root when no origin exists.
- **Preserve/derive** - Preserves original spans while assigning derivative outputs to their input roots.
- **Clear** - Emits `origin: undefined`, making the output a new root.
- **Merge array** - Records every normalized input span in a merged group.
- **None** - Output regions are not derivatives of individual input spans.
- **Per branch** - Original and transformed branches follow their respective origin policies.

Origin records expose `data` as `unknown` because the root may predate a data-changing transformer.

**Evaluation:**

- **Direct** - Generates spans directly from the document.
- **Sequential** - Reads sources in argument order without materializing the complete combined result.
- **Deferred** - Resolves the source when generation starts.
- **Context lookup** - Reads spans generated by an earlier named layer.
- **Sequential fallback** - Fully checks empty sources in order and emits the first non-empty source.
- **Streaming** - Can emit each result as it reads an input span.
- **Complete input** - Reads the complete input before producing output; operation callbacks receive that stable array as `context.spans`.
- **Complete input once** - Reads a source once and reuses the normalized records for multiple branches.
- **Complete input/sorted** - Reads and sorts the complete input before producing output.
- **Per transformer** - Each composed transformer follows its own evaluation strategy.

Evaluation strategy matters for memory use and for one-shot iterable sources.

### Example Data Types

Examples use the following representative application types. API functions and public types are assumed to be imported from the package root.

```typescript
interface Diagnostic {
    severity: 'error' | 'warning' | 'info';
    message: string;
}

interface Selection {
    primary: boolean;
}

interface ExampleRenderOptions {
    diagnostics?: SpansSource<Diagnostic, ExampleRenderOptions>;
    selections?: SpansSource<Selection, ExampleRenderOptions>;
    userInsertPoint?: SpansSource<undefined, ExampleRenderOptions>;
    pattern?: RegExp;
}
```

---

## Span Sources

### `spansCompose(spanInput, ...transformers)`

Compose a span generator with multiple transformers (left-to-right).

```typescript
spansCompose<Data, RenderOptions>(
    spanInput: SpansSource<Data, RenderOptions>
): GenerateSpans<Data, RenderOptions>

spansCompose<InputData, Data1, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    transform1: TransformSpans<InputData, RenderOptions, Data1>
): GenerateSpans<Data1, RenderOptions>

// Equivalent overloads preserve each intermediate data type through five transforms.
// Longer pipelines use the variadic any fallback.
```

**Parameters:**
- `spanInput` - Initial iterable or generator
- `transformers` - Transformation functions to apply in sequence

With no transformers, the function still returns a `GenerateSpans` wrapper around the input. Data inference is preserved through five transformers. Beyond five, the variadic fallback returns `GenerateSpans<any, RenderOptions>`; split a longer pipeline or annotate its boundary when retaining static data types matters.

**Origin:** Determined by each transformer in the composition. With no transformers, input origins are preserved unchanged.

**Use cases:**

- Build readable left-to-right transformation pipelines.
- Package a reusable source plus its normalization and selection steps.
- Track data-type changes through a sequence of transformers.

**Example:**
```typescript
// Build one viewport span for each group of nearby error diagnostics.
const errorWindows = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    // Keep errors before changing their geometry.
    applyFilter(span => span.data.severity === 'error'),
    // Include two context lines around every error.
    applyExpandTo('line', 2),
    // Coalesce overlapping context windows.
    applyMerge(),
    // Limit each merged region to a practical horizontal viewport.
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

Inputs are evaluated once in argument order. Their spans are emitted unchanged and are not sorted, merged, or deduplicated. No inputs produce an empty generator.

**Origin:** Preserves the origin supplied by every input source.

**Use cases:**

- Combine independent patterns into one layer.
- Aggregate parser, diagnostic, or layer sources without merging their spans.
- Preserve source ordering when later transforms depend on it.

**Example:**
```typescript
// Emit ERROR matches first, followed by WARNING matches.
// The two sets remain separate even when their spans overlap.
const logLevels = spansConcat(
    spansFromMatch(/\bERROR\b/g),
    spansFromMatch(/\bWARNING\b/g)
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

The source recognizes `\n`, `\r`, and `\r\n`; a CRLF pair is one newline. It represents the final logical line even when it is empty. Consequently, an empty document produces one line span or point span for every mode except `'newline'`, which only emits actual newline sequences.

**Origin:** None. Every line span is a new source span.

**Use cases:**

- Wrap or style complete lines or line content.
- Insert line numbers, diff markers, or controls at line boundaries.
- Select newline sequences independently from line content.

**Examples:**
```typescript
// Select complete lines, including their trailing newline sequences.
const lines = spansFromLines('line')

// Create insertion points for prefixes such as line numbers or diff markers.
const lineStarts = spansFromLines('line-start')
```

---

### `spansFromMatch(pattern)`

Find all occurrences matching a string or regular expression.

```typescript
spansFromMatch(pattern: RegExp): GenerateSpans<RegExpExecArray, RenderOptions>
spansFromMatch(pattern: string): GenerateSpans<string, RenderOptions>
```

**Parameters:**
- `pattern` - RegExp or literal string to match

**Data:** Full `RegExpExecArray` (includes capture groups) for RegExp, matched string for string literal

**Matching behavior:**
- A global RegExp emits every non-overlapping match; a non-global RegExp emits only its first match.
- Zero-width matches produce point spans. Repeated RegExp matches advance by code point in Unicode mode and by code unit otherwise.
- An empty string matches every document offset, including the end offset.
- Each generation uses a fresh copy of the RegExp starting at `lastIndex = 0`; the supplied RegExp is not mutated.

**Origin:** None. Every match is a new source span.

**Use cases:**

- Highlight literal tokens or regular-expression matches.
- Capture structured text for later `applyDataMap()` processing.
- Generate point spans from lookahead or other zero-width patterns.

**Examples:**
```typescript
// Find every function declaration; span.data[1] contains the function name.
const functionDeclarations = spansFromMatch(/function\s+(\w+)/gi)

// Find exact TODO markers without RegExp capture data.
const todos = spansFromMatch('TODO')
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
  - Iterable of tuples `[start, end, data?, origin?]` or records `{start, end, data?, origin?}`
  - Generator function `(document, renderOptions?) => SpansSource`

**Data:** `undefined` for document keywords, otherwise preserves input data

Inputs are normalized to span records when generated. Existing `data` and `origin` are preserved. An iterable object is captured as supplied: arrays and reusable iterables can be generated repeatedly, but a one-shot generator iterable is exhausted after the first generation. Pass a factory when each render needs fresh input.

**Origin:** Preserves an origin supplied by a tuple or record. Document-keyword spans and inputs without origin remain source spans with `origin: undefined`.

**Use cases:**

- Adapt parser, linter, or test-fixture output to `SpansSource`.
- Create full-document or document-boundary spans.
- Generate document-dependent spans through a reusable factory.

**Examples:**
```typescript
// Cover the complete document for a document-level wrapper.
const documentSpan = spansFrom('document')

// Normalize spans produced by an external parser or language service.
const diagnostics = spansFrom([
    [0, 5, { severity: 'error' }],
    { start: 12, end: 19, data: { severity: 'warning' } }
])

// Use a factory when the source depends on the current document or must be reusable.
const firstHundredCharacters = spansFrom((document) => [
    [0, Math.min(document.length, 100), { truncated: document.length > 100 }]
])
```

---

### `spansFromLayer(name)`

Reference spans from another pipeline layer by name.

```typescript
spansFromLayer<Data>(name: string): GenerateSpans<Data, RenderOptions>
```

**Parameters:**
- `name` - Layer name to reference

The named layer must have been generated earlier in the same pipeline render. Its normalized spans, including data and origin, are emitted in their stored order. A missing name produces no spans.

**Origin:** Preserves the origins stored on the referenced layer spans.

**Use cases:**

- Derive presentation layers from an earlier analytical layer.
- Reuse expensive generated spans without running the source again.
- Apply different geometry or hooks to the same named span set.

**Example:**
```typescript
const pipeline = html()
    // Name the source layer so later layers can reuse its generated spans.
    .addLayer(
        spansFromMatch(/\berror\b/gi),
        content => `<mark>${content}</mark>`,
        'errors'
    )
    // Derive full-line regions from the already generated error spans.
    .addLayer(
        spansCompose(
            spansFromLayer<RegExpExecArray>('errors'),
            applyExpandTo('line')
        ),
        content => `<div class="error-line">${content}</div>`
    )
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

Resolution is deferred until generation. If no render options were provided, the callback receives an empty object. A supplied falsy options value is preserved rather than replaced. Returning `null` or `undefined`, or resolving a missing field, produces no spans.

**Origin:** Preserves origins from the source selected through render options.

**Use cases:**

- Accept caller-provided selections, diagnostics, or insertion points.
- Enable or configure a source per render.
- Derive a source from several render-option fields.

**Examples:**
```typescript
// Read a caller-provided source directly from a render-options field.
const selections = spansFromOptions<Selection, ExampleRenderOptions>('selections')

// Build a source conditionally from several option values.
const searchMatches = spansFromOptions<RegExpExecArray, ExampleRenderOptions>(({ pattern }) =>
    pattern ? spansFromMatch(pattern) : null
)
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

Each input is evaluated at most once. Empty inputs are consumed while searching; every span from the first non-empty input is emitted, and later inputs are not evaluated. One-shot iterable candidates therefore cannot be retried after this generation.

**Origin:** Preserves origins from the first non-empty source.

**Use cases:**

- Choose an explicit insertion point before applying convention-based defaults.
- Fall back from precise matches to broader matches.
- Guarantee a preferred result when earlier sources may be empty.

**Example:**
```typescript
// Prefer an explicit insertion point, then an existing marker,
// and finally fall back to the start of the document.
const tocInsertionPoint = spansWithFallback(
    spansFromOptions<undefined, ExampleRenderOptions>('userInsertPoint'),
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

The input is emitted first, followed by each source in argument order. Records are passed through without sorting or deduplication, so their existing data and origin are preserved. Unlike `spansConcat()`, this transformer can be inserted midway through a composition and later transformers see the combined output.

**Origin:** Preserves origins from the pipeline input and every appended source.

**Use cases:**

- Add document or line boundary markers mid-pipeline.
- Combine transformed spans with an independent source before later processing.
- Append metadata or decoration spans without deriving them from each input span.

**Example:**
```typescript
// Assume a linter supplied error offsets without per-span data.
// Add document boundary insertion points to that set.
// Later transformers receive both the matches and the appended points.
const errorsWithBoundaries = spansCompose(
    spansFrom([[6, 11], [24, 29]]),
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

The complete input is collected before callbacks run. For each input, the original is emitted first and then callback emissions are added in call order. `context.spans` is the complete input and `context.index` is the current input index. Additional spans use `span.origin || span` as their root and may use a different data type from the originals.

**Origin:** Original spans preserve their existing origins. Additional spans preserve the input root, or use the input span as their root when it has no origin.

**Use cases:**

- Add gutter markers while retaining the original diagnostic spans.
- Emit related insertion points, labels, or decorations beside each input.
- Extend a layer with derivative data without replacing its original data.

**Example:**
```typescript
// Keep every diagnostic span and add a related gutter marker at its line start.
const diagnosticsWithMarkers = spansCompose(
    spansFromOptions<Diagnostic, ExampleRenderOptions>('diagnostics'),
    applyAugment((span, createSpan, { lines }) => {
        const lineStart = lines.getLineStart(span.start);
        // The emitted marker automatically derives from the current diagnostic.
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

Every input produces one point span and retains its data. The output preserves an existing root or records the input as its root. For a non-empty multiline input, `'line-start'` uses the line containing `start`, while `'line-end'` and `'line-content-end'` use the line containing `end - 1`; this avoids treating an end-exclusive boundary at the next line as part of the span.

**Origin:** Derives every point span from the input root. If the input has no origin, the input span becomes the root.

**Use cases:**

- Convert ranges into insertion points for prefixes, suffixes, or icons.
- Place markers at line or document boundaries related to a match.
- Collapse several spans to a shared point before merging them.

**Examples:**
```typescript
// Convert each match into an insertion point immediately before the match.
const matchStarts = spansCompose(
    spansFromMatch(/error/g),
    applyCollapseTo('start')
)

// Convert diagnostics into markers at the content end of their final lines.
const diagnosticLineEnds = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyCollapseTo('line-content-end')
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
  - `context` - Operation context with `{ document, lines, renderOptions, spans, index }`

The complete input is collected first. Geometry and order are unchanged; `context.spans` contains that complete input and `context.index` identifies the current span. Because mapped data is the new semantic root, outputs do not retain an old origin. Include old data explicitly in `NewData` when it is still needed.

**Origin:** Cleared. Every mapped span becomes a new source root with `origin: undefined`.

**Use cases:**

- Convert RegExp capture arrays into domain objects.
- Normalize parser or diagnostic metadata while preserving geometry.
- Add computed identifiers or fields to span data.

**Example:**
```typescript
// Replace RegExpExecArray data with the domain data used by render hooks.
const assignments = spansCompose(
    spansFromMatch(/(\w+)=(\w+)/g),
    applyDataMap(span => {
        const [, key, value] = span.data;
        // The old match data is not retained unless it is included here.
        return { key, value };
    })
)

// Add stable IDs while retaining the existing domain fields explicitly.
const indexedDiagnostics = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyDataMap((span, { index }) => ({
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

Every input produces one derivative with unchanged data. Existing roots are preserved. A scalar `lines` value applies symmetrically; a tuple controls each side. Context counts apply only to line-based positions and line lookups use `end - 1` for non-empty spans, respecting end-exclusive geometry. Document positions ignore `lines`.

**Origin:** Derives expanded spans from the input root. If the input has no origin, the input span becomes the root.

**Use cases:**

- Expand diagnostics or matches to complete lines.
- Build snippets with symmetric or asymmetric context lines.
- Promote local matches to document-level regions.

**Examples:**
```typescript
// Include two complete context lines on both sides of each error.
const symmetricContext = spansCompose(
    spansFromMatch(/error/g),
    applyExpandTo('line', 2)
)

// Include no line before a declaration and five lines after it.
const functionPreviews = spansCompose(
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

The input is tried first, then each fallback once in argument order. Every span from the first non-empty source is emitted unchanged; later sources are not evaluated. Empty one-shot inputs are consumed by the check.

**Origin:** Preserves origins from whichever source, input or fallback, first produces spans.

**Use cases:**

- Fall back from errors to warnings when the primary pipeline is empty.
- Supply a default viewport or insertion point.
- Keep fallback selection inside an existing composition.

**Example:**
```typescript
// Use errors when present, otherwise warnings, otherwise the first text preview.
// Every candidate produces RegExpExecArray data, as required by the transformer.
const mostImportantMessages = spansCompose(
    spansFromMatch(/error/gi),
    applyFallback(
        spansFromMatch(/warning/gi),
        spansFromMatch(/[\s\S]{1,100}/) // Used only when both prior sources are empty.
    )
)
```

---

### `applyFilter(predicate)`

Filter spans using a predicate function.

```typescript
applyFilter<Data, RenderOptions>(
    predicate: (
        span: SpanRecord<Data>,
        context: SpanOperationContext<Data, RenderOptions>
    ) => boolean
): TransformSpans<Data, RenderOptions>
```

**Parameters:**
- `predicate` - Function receiving:
  - `span` - Full span object `{start, end, data, origin}`
  - `context` - Operation context with `{ document, lines, renderOptions, spans, index }`

The complete input is collected before predicate evaluation. Selected records retain their geometry, data, origin, and input order. `context.spans` includes selected and rejected inputs; `context.index` is the current input index.

**Origin:** Preserves each selected span's existing origin unchanged.

**Use cases:**

- Select diagnostics by severity or metadata.
- Keep spans that satisfy document or line-based conditions.
- Select by input position through `context.index`.

**Examples:**
```typescript
// Keep only diagnostics that are errors and stay on one line.
const singleLineErrors = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyFilter((span, { lines }) =>
        span.data.severity === 'error' &&
        lines.getLine(span.start) === lines.getLine(span.end)
    )
)

// Use context.index rather than a positional callback argument.
const alternatingMatches = spansCompose(
    spansFromMatch(/\w+/g),
    applyFilter((_span, { index }) => index % 2 === 0)
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
- `size` - Maximum window width in UTF-16 code units (default: `80`)
- `allowTrimming` - Allow trimming spans to fit (default: `true`)

Each input emits one derivative on the line containing its start. Multiline inputs are first reduced to that line's content. A span shorter than `size` expands toward both sides without crossing line-content boundaries; unused room on one side is reassigned to the other. A longer span is trimmed from the right when `allowTrimming` is true and otherwise remains longer than the requested window. Data and root origin are preserved.

**Origin:** Derives each fitted viewport from the input root. If the input has no origin, the input span becomes the root.

**Use cases:**

- Create horizontally bounded search or diagnostic previews.
- Center short matches within available line context.
- Trim multiline or oversized spans for viewport rendering.

**Examples:**
```typescript
// Expand a short match into an excerpt no wider than the default 80 units.
const defaultPreviews = spansCompose(
    spansFromMatch(/error/g),
    applyFitToWindow()
)

// Use a wider viewport and preserve matches that are already wider than it.
const untrimmedPreviews = spansCompose(
    spansFromMatch(/error/g),
    applyFitToWindow(120, false)
)
```

---

### `applyFork(...transformers)`

Fork the pipeline: pass through originals, apply sub-pipeline, append transformed copies.

```typescript
applyFork<Data, RenderOptions, OutputData>(
    transform1: TransformSpans<Data, RenderOptions, OutputData>
): TransformSpans<Data, RenderOptions, Data | OutputData>

// Typed overloads preserve intermediate data through three transforms.
```

**Parameters:**
- `transformers` - Sub-pipeline transformers to apply to input spans

The input is collected once, which makes a one-shot iterable safe to use for both branches. All originals are emitted first in input order, followed by the sub-pipeline output. With no transformers, the collected inputs are emitted twice. Original origins are preserved; transformed origins follow each transformer's policy. Data is inferred as a union of original and branch output through three transformers, then falls back to `any` for a longer branch.

**Origin:** Per branch. Original spans preserve their origins; transformed copies follow the origin policy of each transformer in the branch.

**Use cases:**

- Keep original matches while adding transformed markers or decorations.
- Apply a secondary transformation path without duplicating source evaluation.
- Produce a union of original and branch-specific data in one layer.

**Example:**
```typescript
// Emit the error matches first, followed by line-start marker derivatives.
const errorsAndMarkers = spansCompose(
    spansFromMatch(/error/g),
    applyFork(
        // This sub-pipeline runs only for the appended branch.
        applyCollapseTo('line-start'),
        applyDataMap(() => ({ type: 'marker' }))
    )
)
```

---

### `applyInvert(exact?)`

Invert spans - returns everything NOT in input spans. **Output spans have no origin** (no direct connection to input).

```typescript
applyInvert<Data, RenderOptions>(
    exact?: boolean
): TransformSpans<Data, RenderOptions, undefined>
```

**Parameters:**
- `exact` - Boundary behavior:
  - `true` - A trailing gap ends at `document.length`
  - `false` (default) - A trailing gap ends at `document.length + 1`

Input spans are sorted and merged before gaps are calculated. Empty input produces no output rather than a full-document span. Internal and leading gaps use the adjacent input boundaries. The extra `document.length + 1` endpoint applies only when a trailing gap exists; input coverage ending at the document end produces no trailing gap. Outputs have `data: undefined` and no origin.

**Origin:** None. Gap spans are complements of the input set, not derivatives of individual input spans.

**Use cases:**

- Find omitted regions between visible context windows.
- Build negative highlighting or exclusion layers.
- Generate collapsible gaps between retained document regions.

**Example:**
```typescript
// Derive the regions omitted between visible diagnostic context windows.
// A renderer can replace these complement spans with separators or ellipses.
const omittedRegions = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyExpandTo('line', 1),
    applyMerge(),
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

The complete input is collected before callbacks run. A callback may emit zero, one, or many outputs; outputs appear in input order and then callback call order. `context.spans` is the complete input and `context.index` is current. Every emitted span uses `span.origin || span` as its root. Unlike `applyDataMap()`, geometry and cardinality are unrestricted.

**Origin:** Derives every emitted span from the input root. If the input has no origin, the input span becomes the root.

**Use cases:**

- Split one match into several independently rendered parts.
- Conditionally emit zero or more spans for each input.
- Implement custom geometry and output-data transformations.

**Examples:**
```typescript
// Split each log token into independently renderable prefix and severity spans.
const logTokenParts = spansCompose(
    spansFromMatch(/(?:(\w+) )?(ERROR|WARNING|INFO)/g),
    applyMap((span, createSpan) => {
        const prefix = span.data[1];
        let labelStart = span.start;

        if (prefix !== undefined) {
            // Emit the optional prefix as the first derivative.
            createSpan(span.start, span.start + prefix.length, 'prefix');
            labelStart += prefix.length + 1; // Skip the separating space.
        }

        // Emit the severity label as the second derivative.
        createSpan(labelStart, span.end, span.data[2]);
    })
)

// Emitting nothing for a callback input is a valid 1-to-0 mapping.
const longWords = spansCompose(
    spansFromMatch(/\w+/g),
    applyMap((span, createSpan, { document }) => {
        if (document.slice(span.start, span.end).length >= 8) {
            createSpan(span.start, span.end, { kind: 'long-word' });
        }
    })
)
```

---

### `applyMerge()`

Merge overlapping or adjacent spans into continuous regions.

```typescript
applyMerge<Data, RenderOptions>(): TransformSpans<Data, RenderOptions, undefined>
```

The complete input is sorted by `start` ascending and then `end` ascending. Each disjoint group produces one output; adjacency merges because `next.start <= current.end`. Output order follows the sorted groups, regardless of input order. Merged outputs have `data: undefined`; `origin` is an array of normalized records for every group member, including each member's prior origin.

**Origin:** An array containing every normalized input span in the merged group. Each member retains its own prior origin.

**Use cases:**

- Coalesce overlapping highlights or context windows.
- Convert adjacent spans into continuous render regions.
- Retain access to every group member for summaries or aggregate hooks.

**Example:**
```typescript
// Nearby diagnostics may expand to overlapping line windows.
// Merge them into disjoint render regions; each output origin lists its group.
const diagnosticRegions = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyExpandTo('line', 1),
    applyMerge()
)
```

---

### `applyPadLines(lines, size)`

Add padding spans around lines.

```typescript
applyPadLines<Data, RenderOptions>(
    lines: number | [linesBefore: number, linesAfter: number],
    size: number
): TransformSpans<Data, RenderOptions, number>
```

**Parameters:**
- `lines` - Padding line count:
  - Number: lines after only (e.g., `2` = 0 before, 2 after)
  - Tuple: `[before, after]` for explicit control (e.g., `[1, 2]`)
- `size` - Target width for each selected line in UTF-16 code units

For each input and selected relative line, the transformer emits `[lineStart, min(lineStart + size, lineContentEnd)]`. A scalar selects that many lines after the input line and no lines before it; a tuple controls both sides. Output `data` is `size - emittedLength`, the number of missing UTF-16 code units needed to reach the target width. Outputs preserve an existing root or derive from the input. Overlapping selected lines from different inputs are not deduplicated.

**Origin:** Derives each selected line span from the input root. If the input has no origin, the input span becomes the root.

**Use cases:**

- Compute how much padding each selected line needs to reach a target width.
- Add fixed-width context lines before or after an input.
- Prepare rectangular text regions for terminal or structured rendering.

**Examples:**
```typescript
// Select the input line and two following lines, each capped at width 50.
const forwardPadding = spansCompose(
    spansFromLines('line-content'),
    applyPadLines(2, 50)
)

// Select one line before and two after each diagnostic line.
const surroundingPadding = spansCompose(
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

Geometry, data, and order are unchanged. Clearing the origin makes each output the root for later positional derivatives; it does not modify the input record.

**Origin:** Cleared. Every output becomes a new root with `origin: undefined`.

**Use cases:**

- Make a fitted or expanded region the root of later transformations.
- Stop later derivatives from referring back to an obsolete geometry.
- Deliberately establish a new lineage boundary.

**Example:**
```typescript
// Make each fitted viewport the new root before deriving its end marker.
const viewportEndMarkers = spansCompose(
    spansFromMatch(/error/g),
    applyExpandTo('line'),
    applyFitToWindow(80),
    applyResetOrigin(),
    // The marker now points to the viewport, not the original match.
    applyCollapseTo('end')
)
```

---

### `applySort(comparator?)`

Sort spans by custom criteria.

```typescript
applySort<Data, RenderOptions>(
    comparator?: (
        spanA: SpanRecord<Data>,
        spanB: SpanRecord<Data>,
        context: SpanOperationContext<Data, RenderOptions>
    ) => number
): TransformSpans<Data, RenderOptions>
```

**Parameters:**
- `comparator` - Comparison function (optional):
  - Receives `spanA`, `spanB`, `context`
  - Returns negative (A before B), zero (equal), or positive (B before A)
  - Default: sort by start ascending, then end descending

The complete input is collected before sorting. The default order is `start` ascending, then `end` descending, so an outer span precedes an inner span with the same start. Records retain data and origin. A custom comparator receives shared operation context; `context.index` does not identify either comparator argument.

**Origin:** Preserves every span's existing origin unchanged.

**Use cases:**

- Normalize spans into rendering order.
- Prioritize diagnostics or annotations by domain data.
- Apply a stable custom order before limiting or grouping spans.

**Examples:**
```typescript
// Default order: start ascending, then longer spans first at equal starts.
const renderOrder = spansCompose(
    spansFromLayer('syntax'),
    applySort()
)

const severityRank = { error: 0, warning: 1, info: 2 };

// Override the positional order with domain priority.
const diagnosticsBySeverity = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applySort((a, b) =>
        severityRank[a.data.severity] - severityRank[b.data.severity]
    )
)
```

---

### `applyTake(n, predicate?)`

Take the first or last N spans, optionally counting only spans accepted by a predicate.

```typescript
applyTake<Data, RenderOptions>(
    n: number | 'first' | 'last',
    predicate?: (
        span: SpanRecord<Data>,
        context: SpanOperationContext<Data, RenderOptions>
    ) => boolean
): TransformSpans<Data, RenderOptions>
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

The complete input is collected before selection. Without a predicate, selection uses array slicing. With a positive count, predicates run from the start; with a negative count, they run from the end until enough matches are found. Last-N output is restored to input order. `0` emits nothing. Predicate evaluation short-circuits after enough matches, but source consumption does not.

**Origin:** Preserves every selected span's existing origin unchanged.

**Use cases:**

- Limit a layer to its first or last N spans.
- Select the first or last span matching a predicate.
- Keep the most recent matching diagnostics while preserving their input order.

**Examples:**
```typescript
// Take the first ten matches in input order.
const firstTenErrors = spansCompose(
    spansFromMatch(/error/g),
    applyTake(10)
)

// Evaluate from the end, keep the last five matching diagnostics,
// then emit those five in their original input order.
const lastFiveErrors = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyTake(-5, span => span.data.severity === 'error')
)

// Keyword form for the first matching diagnostic.
const firstWarning = spansCompose(
    spansFromLayer<Diagnostic>('diagnostics'),
    applyTake('first', span => span.data.severity === 'warning')
)
```

---

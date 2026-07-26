# Range Functions Reference

Complete API reference for range functions, including signatures, parameters, return types, use cases, and examples.

See [Range Functions Guidelines](range-functions-guidelines.md) for implementation requirements, design principles, and procedures.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Range Sources](#range-sources)
- [Range Transformers](#range-transformers)

## Quick Reference

Range Sources:

| Function | Type | Description | Origin Behavior |
|----------|------|-------------|-----------------|
| [`rangesCompose`](#rangescomposerangeinput-transformers) | Composer | Pipeline composition | Per transformer |
| [`rangesConcat`](#rangesconcatinputs) | Combiner | Combine sources | Preserves existing |
| [`rangesForLines`](#rangesforlinestype) | Source | Line boundaries | None (new ranges) |
| [`rangesForMatch`](#rangesformatchpattern) | Source | Pattern matching | None (new ranges) |
| [`rangesFrom`](#rangesfrominput) | Source | Raw data conversion & document keywords | None (new ranges) |
| [`rangesFromLayer`](#rangesfromlayername) | Source | Layer reference | Preserves existing |
| [`rangesFromOptions`](#rangesfromoptionsrangeinput) | Source | User options | Preserves existing |
| [`rangesWithFallback`](#rangeswithfallbackinputs) | Combiner | First non-empty | Preserves existing |

Range Transformers:

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
| [`applyInvert`](#applyinvertexact) | N-to-M | Negate ranges | No | None | Temp array |
| [`applyMap`](#applymapcallback) | 1-to-N | Transform ranges | No | Creates new | Temp array* |
| [`applyMerge`](#applymerge) | N-to-1 | Merge overlapping | No | Array of merged | Temp array |
| [`applyPadLines`](#applypadlineslines-size) | 1-to-N | Add padding | No | Inherits | Temp array |
| [`applyResetOrigin`](#applyresetorigin) | 1-to-1 | Clear origins | No | Cleared | Streaming |
| [`applySort`](#applysortcomparator) | N-to-N | Custom ordering | No | Inherits | Temp array* |
| [`applyTake`](#applytaken-predicate) | N-to-N | Take first/last N + filter | No | Inherits | Temp array |

**Implementation notes:**
- **Streaming** - Processes ranges one-by-one without collecting in memory (1-to-1 transforms)
- **Temp array*** - Required for predicate callbacks to provide stable `context.ranges` parameter
- **Temp array** - Required for complex logic (merging, inverting, windowing, padding)
- **Wrapper** - Delegates to other range functions (composition helper)

**Transform types:**
- **1-to-1** - Each input range produces exactly one output range
- **1-to-N** - Each input range may produce multiple output ranges
- **N-to-1** - Multiple input ranges combined into one output range
- **N-to-N** - Variable number of output ranges (filtering, windowing)
- **N-to-M** - Complete transformation (inversion)

**Origin behavior:**
- **Inherits** - Passes through existing origin, or creates new from input range
- **Array of merged** - Creates array of all merged ranges (enables access to individuals)
- **None** - No relationship between input and output (inversions)
- **Cleared** - Sets to `undefined` (data transformations create new semantic meaning)
- **Preserves existing** - Keeps whatever origin was in source ranges

---

## Range Sources

### `rangesCompose(rangeInput, ...transformers)`

Compose a range generator with multiple transformers (left-to-right).

```typescript
rangesCompose<Data, RenderOptions>(
    rangeInput: Ranges<Data, RenderOptions>,
    ...transformers: Array<(input: Ranges) => GenerateRanges>
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `rangeInput` - Initial range generator
- `transformers` - Transformation functions to apply in sequence

**Use cases:**
- Building transformation pipelines
- Combining multiple transformations
- Creating reusable compositions

**Example:**
```typescript
// Multi-step pipeline
rangesCompose(
    rangesFromLayer('diagnostics'),
    applyFilter(range => range.data.severity === 'error'),
    applyExpandTo('line', 2),
    applyMerge(),
    applyFitToWindow(1000)
)
```

---
### `rangesConcat(...inputs)`

Combine multiple range sources into a flat list without merging.

```typescript
rangesConcat<Data, RenderOptions>(
    ...inputs: Array<Ranges<Data, RenderOptions>>
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `inputs` - One or more range sources to combine

**Use cases:**
- Multi-pattern matching
- Combining different source types
- Layer aggregation

**Example:**
```typescript
// Collect multiple severity levels
rangesConcat(
    rangesForMatch(/ERROR/g),
    rangesForMatch(/WARNING/g),
    rangesFromLayer('diagnostics')
)
```

---

### `rangesForLines(type?)`

Generate ranges for line boundaries in various formats.

```typescript
rangesForLines(
    type?: 'line' | 'line-content' | 'newline' | 'line-start' | 'line-end' | 'line-content-end'
): GenerateRanges<number, RenderOptions>
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
rangesForLines('line-start')

// Highlight full lines
rangesForLines('line')
```

---

### `rangesForMatch(pattern)`

Find all occurrences matching a string or regular expression.

```typescript
rangesForMatch(pattern: RegExp): GenerateRanges<RegExpExecArray, RenderOptions>
rangesForMatch(pattern: string): GenerateRanges<string, RenderOptions>
```

**Parameters:**
- `pattern` - RegExp (with `g` flag) or string to match

**Data:** Full `RegExpExecArray` (includes capture groups) for RegExp, matched string for string literal

**Use cases:**
- Syntax highlighting
- Finding diagnostic markers
- Extracting structured patterns

**Example:**
```typescript
// Find function declarations with capture groups
rangesForMatch(/function\s+(\w+)/gi)

// Simple string matching
rangesForMatch('TODO')
```

---

### `rangesFrom(input)`

Convert raw range data or document keywords into `GenerateRanges` function.

```typescript
rangesFrom<Data>(
    input: 'document' | 'document-start' | 'document-end' | 
           RangeIterable<Data> | 
           RangesGenerator<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `input` - One of:
  - `'document'` - Full document range `[0, document.length]`
  - `'document-start'` - Zero-length range at position 0
  - `'document-end'` - Zero-length range at `document.length`
  - Iterable of tuples `[start, end, data?]` or objects `{start, end, data?}`
  - Generator function `(document, renderOptions?) => Ranges`

**Data:** `undefined` for document keywords, otherwise preserves input data

**Use cases:**
- Document-level operations (wrap entire content, document boundaries)
- Integrating external tools (linters, parsers)
- Converting custom formats
- Testing with fixtures
- Dynamic range generation based on document

**Example:**
```typescript
// Full document range
rangesFrom('document')

// Document boundary insertion point
rangesFrom('document-start')

// From external linter
const diagnostics = await linter.lint(document);
rangesFrom(diagnostics)

// From tuple array
rangesFrom([[0, 5], [10, 15]])

// From generator function
rangesFrom((document) => document.length > 100 ? [[0, 100]] : [])
```

---

### `rangesFromLayer(name)`

Reference ranges from another pipeline layer by name.

```typescript
rangesFromLayer<Data>(name: string): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `name` - Layer name to reference

**Use cases:**
- Building dependent layers
- Applying different styles to same ranges
- Cross-layer filtering

**Example:**
```typescript
// Use diagnostics from another layer
rangesFromLayer('diagnostics')
```

---

### `rangesFromOptions(rangeInput)`

Get ranges from render options (user-configurable).

```typescript
rangesFromOptions<Data>(
    rangeInput: ((renderOptions: RenderOptions) => Ranges<Data, RenderOptions> | null | undefined) | keyof RenderOptions
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `rangeInput` - Either a callback function that receives render options and returns ranges, or a field name (shortcut for accessing a property)

**Use cases:**
- User-configurable highlighting
- Editor selections
- Custom range inputs
- Conditional range generation

**Example:**
```typescript
// Using field name shortcut
rangesFromOptions('tocInsertPoint')

// Using callback for conditional logic
rangesFromOptions(({ pattern }) => pattern && rangesForMatch(pattern))
```

---

### `rangesWithFallback(...inputs)`

Try multiple range sources in order, return first non-empty result.

```typescript
rangesWithFallback<Data, RenderOptions>(
    ...inputs: Ranges<Data, RenderOptions>[]
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `inputs` - Range sources to try in order

**Use cases:**
- Graceful degradation
- Default values when no matches
- Progressive pattern matching

**Example:**
```typescript
// Find best insertion point with fallbacks
rangesWithFallback(
    rangesFromOptions('userInsertPoint'),
    rangesForMatch(/<!-- TOC -->/),
    rangesFrom('document-start')
)
```

---

## Range Transformers

### `applyAppend(...sources)`

Append independent range sources mid-pipeline.

```typescript
applyAppend<Data, RenderOptions>(
    ...sources: Array<Ranges<Data, RenderOptions>>
): TransformRanges<Data, RenderOptions>
```

**Parameters:**
- `sources` - Range sources to append (iterables, generators, keywords)

**Origin:** Preserves existing origins from all sources

**Use cases:**
- Add document boundary markers
- Add line numbers for all lines
- Combine pipeline output with independent ranges

**Example:**
```typescript
// Pass through matched errors, append document boundaries
rangesCompose(
    rangesForMatch(/error/g),
    applyAppend(
        rangesFrom('document-start'),
        rangesFrom('document-end')
    )
)
```

---

### `applyAugment(callback)`

Pass through original ranges unchanged, add derived ranges.

```typescript
applyAugment<Data, RenderOptions>(
        augmenter: (
        range: RangeRecord<Data>,
                createRange: (start: number, end: number, data?: Data) => void,
                opContext: RangeOperationContext<RenderOptions>
    ) => void
): TransformRanges<Data, RenderOptions>
```

**Parameters:**
- `augmenter` - Function that creates additional ranges via `createRange(start, end, data?)`
  - `range` - Current input range (passed through unchanged)
  - `createRange` - Function to create derivative ranges
    - `opContext` - Operation context with `{ document, lines, renderOptions, ranges, index }`

Additional ranges use the same data type as the input. Use `applyMap()` when derivatives need a different output data type.

**Origin:** Original range keeps its origin unchanged, derivatives get automatic origin tracking

**Use cases:**
- Add line-start markers for diagnostics
- Add margin decorations while preserving original ranges
- Create visual guides alongside content ranges

**Example:**
```typescript
// Pass through errors, add line-start marker for each
rangesCompose(
    rangesFromOptions('diagnostics'),
    applyAugment((range, createRange, { lines }) => {
        const lineStart = lines.getLineStart(range.start);
        createRange(lineStart, lineStart, range.data);
    })
)
```

---

### `applyCollapseTo(position)`

Collapse ranges to zero-width markers at specific positions.

```typescript
applyCollapseTo(
    position: 'start' | 'end' | 
              'line-start' | 'line-end' | 'line-content-end' |
              'document-start' | 'document-end'
): TransformRanges
```

**Parameters:**
- `position` - Target position:
  - `'start'` - Beginning of range
  - `'end'` - End of range
  - `'line-start'` - Start of line containing range start
  - `'line-end'` - End of line containing range end (after newline)
  - `'line-content-end'` - End of line content (before newline)
  - `'document-start'` - Start of document (0)
  - `'document-end'` - End of document (`document.length`)

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Creating insertion points
- Line/document markers
- Icon/decoration placement

**Example:**
```typescript
// Insert markers at match start
rangesCompose(
    rangesForMatch(/error/g),
    applyCollapseTo('start')
)
```

---

### `applyDataMap(mapper)`

Transform range data while preserving positions. **Clears `origin` tracking** (data transformation creates new semantic meaning).

```typescript
applyDataMap<Data, NewData, RenderOptions>(
    mapper: (
        range: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => NewData
): (input: Ranges<Data, RenderOptions>) =>
    GenerateRanges<NewData, RenderOptions>
```

**Parameters:**
- `mapper` - Transformation function receiving:
  - `range` - Full range object
  - `opContext` - Operation context with `{ document, lines, renderOptions, ranges, index }`

**Origin:** Cleared (`undefined`) - new semantic meaning

**Use cases:**
- Adding computed properties
- Enriching external data
- Normalizing data formats

**Example:**
```typescript
// Parse match data
rangesCompose(
    rangesForMatch(/(\w+)=(\w+)/g),
    applyDataMap(range => {
        const [, key, value] = range.data;
        return { key, value };
    })
)

// Add sequential IDs
rangesCompose(
    ranges,
    applyDataMap((range, { index }) => ({
        ...range.data,
        id: `item-${index}`
    }))
)
```

---

### `applyExpandTo(position, lines?)`

Expand ranges to broader boundaries with optional context lines.

```typescript
applyExpandTo(
    position: 'line' | 'line-content' | 'line-start' | 'line-end' | 'line-content-end' | 
              'document' | 'document-start' | 'document-end',
    lines?: number | [before: number, after: number]
): TransformRanges
```

**Parameters:**
- `position` - Target boundary type (see `applyCollapseTo` for position descriptions)
- `lines` - Context lines to include:
  - Number: same count before and after (e.g., `2` = 2 before, 2 after)
  - Tuple: `[before, after]` for asymmetric context (e.g., `[1, 3]`)

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Context highlighting
- Code block expansion
- Snippet extraction with context

**Example:**
```typescript
// Expand to full lines with 2 lines context
rangesCompose(
    rangesForMatch(/error/g),
    applyExpandTo('line', 2)
)

// Asymmetric context: show function body
rangesCompose(
    rangesForMatch(/^function/gm),
    applyExpandTo('line', [0, 5])
)
```

---

### `applyFallback(...fallbacks)`

Provides fallback ranges when input produces no results (curried transformer).

```typescript
applyFallback<Data, RenderOptions>(
    ...fallbacks: Ranges<Data, RenderOptions>[]
): TransformRanges<Data, RenderOptions>
```

**Parameters:**
- `fallbacks` - Fallback range sources to try in order if input is empty

**Origin:** Depends on which source provides ranges (input or fallback)

**Use cases:**
- Graceful degradation
- Default values when primary source is empty
- Ensuring non-empty results

**Example:**
```typescript
// Show errors, or warnings if no errors
rangesCompose(
    rangesForMatch(/error/gi),
    applyFallback(
        rangesForMatch(/warning/gi),
        [[0, 100]]  // Show first 100 chars if nothing found
    )
)

// Insert TOC with fallback positions
rangesCompose(
    rangesFromOptions('tocInsertPoint'),
    applyFallback(
        rangesForMatch(/^(?=#[^#])/m),  // Before first H1
        [[0, 0]]  // Document start
    )
)
```
### `applyFilter(predicate)`

Filter ranges using a predicate function.

```typescript
applyFilter<Data, RenderOptions>(
    predicate: (
        range: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => boolean
): TransformRanges<Data, RenderOptions>
```

**Parameters:**
- `predicate` - Function receiving:
  - `range` - Full range object `{start, end, data, origin}`
    - `opContext` - `{document, lines, renderOptions, ranges, index}`

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Conditional highlighting
- Severity filtering
- Position-based selection

**Example:**
```typescript
// Filter single-line ranges only
rangesCompose(
    rangesForMatch(/\w+/g),
    applyFilter((range, { lines }) =>
        lines.getLine(range.start) === lines.getLine(range.end)
    )
)

// Filter by data property
rangesCompose(
    diagnostics,
    applyFilter(range => range.data.severity === 'error')
)
```

---

### `applyFitToWindow(size?, allowTrimming?)`

Fit ranges within a size constraint (viewport).

```typescript
applyFitToWindow(
    size?: number,
    allowTrimming?: boolean
): TransformRanges
```

**Parameters:**
- `size` - Maximum window width in characters (default: `80`)
- `allowTrimming` - Allow trimming ranges to fit (default: `true`)

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Preview generation
- Horizontal viewport fitting
- Performance optimization

**Example:**
```typescript
// Fit into 80-char window (default)
rangesCompose(
    rangesForMatch(/error/g),
    applyFitToWindow()
)

// Custom size with no trimming
rangesCompose(
    rangesForMatch(/error/g),
    applyFitToWindow(120, false)
)
```

---

### `applyFork(...transformers)`

Fork the pipeline: pass through originals, apply sub-pipeline, append transformed copies.

```typescript
applyFork<Data, RenderOptions>(
    ...transformers: Array<TransformRanges<Data, RenderOptions>>
): TransformRanges<Data, RenderOptions>
```

**Parameters:**
- `transformers` - Sub-pipeline transformers to apply to input ranges

**Origin:** Preserves existing origins from all sources (originals unchanged, transformed copies follow their transformer semantics)

**Use cases:**
- Add derivative ranges alongside originals (markers, icons, decorations)
- Show content + metadata (diagnostics + gutter icons)
- Parallel transformations (matches + line indicators)
- Pipeline branching for multi-purpose output

**Example:**
```typescript
// Show error matches + line-start markers
rangesCompose(
    rangesForMatch(/error/g),
    applyFork(
        applyCollapseTo('line-start'),
        applyDataMap(() => ({ type: 'marker' }))
    )
)
```

---

### `applyInvert(exact?)`

Invert ranges - returns everything NOT in input ranges. **Output ranges have no origin** (no direct connection to input).

```typescript
applyInvert(exact?: boolean): TransformRanges
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
rangesCompose(
    rangesForMatch(/^#{1,6}\s/gm),
    applyExpandTo('line'),
    applyInvert()
)
```

---

### `applyMap(callback)`

Core 1-to-N primitive for range transformation. Creates derivative ranges with automatic origin tracking.

```typescript
applyMap<InputData, OutputData, RenderOptions>(
    mapper: (
        range: RangeRecord<InputData>,
        createRange: (
            start: number,
            end: number,
            data?: OutputData
        ) => void,
        opContext: RangeOperationContext<RenderOptions>
    ) => void
): TransformRanges<OutputData, RenderOptions>
```

**Parameters:**
- `mapper` - Function that creates output ranges via `createRange(start, end, data?)`
  - `range` - Current input range
  - `createRange` - Function to create derivative ranges
  - `opContext` - Operation context with `{ document, lines, renderOptions, ranges, index }`

**Origin:** Automatically tracks to input range (preserves transformation lineage)

**Use cases:**
- Split matched lines into words
- Extract regex capture groups
- Transform one range into multiple derivatives
- Custom range decomposition

**Example:**
```typescript
// Split lines into words
rangesCompose(
    rangesForMatch(/(?:(\w+) )?(ERROR|WARNING|INFO)/g),
    applyMap((range, createRange, { document }) => {
        const prefix = range.data[1]; // optional prefix
        let labelStart = range.start;
        if (prefix !== undefined) {
            createRange(range.start, range.start + prefix.length, 'prefix');  // opening prefix
            labelStart += prefix.length + 1; // +1 for space
        }
        createRange(labelStart, range.end, range.data[2]); // label
   })
)
```

---

### `applyMerge()`

Merge overlapping or adjacent ranges into continuous regions. **Always preserves merged ranges in `origin` field as an array.**

```typescript
applyMerge(): TransformRanges
```

**Origin:** Array of merged ranges (enables access to individual items)

**Use cases:**
- Combining overlapping highlights
- Deduplicating ranges
- Continuous region extraction
- Generating summaries from merged items

**Example:**
```typescript
// Merge with access to individual headers via origin
rangesCompose(
    rangesForMatch(/^#{1,6}\s+(.+)$/gm),
    applyDataMap(match => ({
        level: match[1].length,
        text: match[2]
    })),
    applyCollapseTo('document-start'),
    applyMerge()  // origin contains all headers
)
// In render: range.origin.map(({ data }) => ...)
```

---

### `applyPadLines(lines, size)`

Add padding ranges around lines.

```typescript
applyPadLines(
    lines: number | [before: number, after: number],
    size: number
): TransformRanges
```

**Parameters:**
- `lines` - Padding line count:
  - Number: lines after only (e.g., `2` = 0 before, 2 after)
  - Tuple: `[before, after]` for explicit control (e.g., `[1, 2]`)
- `size` - Target width for each padding line in characters

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Smart spacing
- Visual separation
- Context preservation

**Example:**
```typescript
// Add 2 lines after each range
rangesCompose(
    rangesForLines('line-content'),
    applyPadLines(2, 50)
)

// Add 1 before and 2 after
rangesCompose(
    rangesForLines('line-content'),
    applyPadLines([1, 2], 50)
)
```

---

### `applyResetOrigin()`

Clear origin tracking from ranges.

```typescript
applyResetOrigin(): TransformRanges
```

**Origin:** Cleared (`undefined`)

**Use cases:**
- Clean up transformation history
- Prevent origin bloat
- Fresh transformation chains

**Example:**
```typescript
// Clear origins after complex transformations
rangesCompose(
    ranges,
    applyExpandTo('line'),
    applyMerge(),
    applyResetOrigin()
)
```

---

### `applySort(comparator?)`

Sort ranges by custom criteria.

```typescript
applySort<Data, RenderOptions>(
    comparator?: (
        rangeA: RangeRecord<Data>,
        rangeB: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => number
): TransformRanges<Data, RenderOptions>
```

**Parameters:**
- `comparator` - Comparison function (optional):
    - Receives `rangeA`, `rangeB`, `opContext`
  - Returns negative (A before B), zero (equal), or positive (B before A)
  - Default: sort by start ascending, then end descending

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Rendering order control
- Priority sorting
- Chronological ordering

**Example:**
```typescript
// Default sort
rangesCompose(ranges, applySort())

// Sort by line number
rangesCompose(
    ranges,
    applySort((a, b, { lines }) =>
        lines.getLine(a.start) - lines.getLine(b.start)
    )
)
```

---

### `applyTake(n, predicate?)`

Take first or last N ranges with optional filtering. Combines positional limiting with filtering
for efficient selection - evaluates ranges in order and stops when limit is reached.

```typescript
applyTake(
    n: number | 'first' | 'last',
    predicate?: (range, opContext) => boolean
): TransformRanges
```

**Parameters:**
- `n` - Number of ranges to take:
  - Positive number - Take first N ranges (that match predicate if provided)
  - Negative number - Take last N ranges (that match predicate if provided)
  - `'first'` - Take first range (equivalent to `1`)
  - `'last'` - Take last range (equivalent to `-1`)
- `predicate` - Optional filter function (same signature as `applyFilter`):
  - `range` - Full range object
  - `opContext` - Context with `{ document, lines, renderOptions, ranges, index }`

**Origin:** Inherits from input ranges (direct connection)

**Use cases:**
- Pagination (first/last page of results)
- Limiting output with filtering (top 10 errors, not just any 10 ranges)
- Quick preview (first match only)
- Efficient selection (stops early when limit reached)

**Example:**
```typescript
// Take first 10 matches
rangesCompose(
    rangesForMatch(/error/g),
    applyTake(10)
)

// Take last 5 matches
rangesCompose(
    rangesForMatch(/error/g),
    applyTake(-5)
)

// First error
rangesCompose(
    ...,
    applyTake('first', range => range.data.severity === 'error')
)
```

---

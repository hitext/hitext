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
| [`rangesForMatch`](#rangesformatchpattern) | Source | Pattern matching | None (new ranges) |
| [`rangesForLines`](#rangesforlinestype) | Source | Line boundaries | None (new ranges) |
| [`rangesForPoint`](#rangesforpointposition) | Source | Document points | None (new ranges) |
| [`rangesFrom`](#rangesfrominput) | Source | Raw data conversion | None (new ranges) |
| [`rangesFromLayer`](#rangesfromlayername) | Source | Layer reference | Preserves existing |
| [`rangesFromOptions`](#rangesfromoptionskey) | Source | User options | Preserves existing |
| [`concatRanges`](#concatrangesinputs) | Combiner | Combine sources | Preserves existing |
| [`rangesWithFallback`](#rangeswithfallbackinputs) | Combiner | First non-empty | Preserves existing |
| [`composeRanges`](#composerangessource-transformers) | Composer | Pipeline composition | Per transformer |

Range Transformers:

| Function | Transform Type | Description | Modifies Data | Origin | Implementation |
|----------|----------------|-------------|---------------|--------|----------------|
| [`applyCollapseTo`](#applycollapsetoposition) | 1-to-1 | Zero-width markers | No | Inherits | Streaming |
| [`applyExpandTo`](#applyexpandtoposition-lines) | 1-to-1 | Expand boundaries | No | Inherits | Streaming |
| [`applyMerge`](#applymerge) | N-to-1 | Merge overlapping | No | Array of merged | Temp array |
| [`applyInvert`](#applyinvertexact) | N-to-M | Negate ranges | No | None | Temp array |
| [`applyFilter`](#applyfilterpredicate) | N-to-N | Conditional selection | No | Inherits | Temp array* |
| [`applyPick`](#applypickselector) | N-to-1 | Single selection | No | Inherits | Temp array* |
| [`applySort`](#applysortcomparator) | N-to-N | Custom ordering | No | Inherits | Temp array* |
| [`applyDataMap`](#applydatamapmapper) | 1-to-1 | Data transformation | Yes | Cleared | Temp array* |
| [`applyFitToWindow`](#applyfittowindowsize-allowtrimming) | 1-to-1 | Horizontal viewport | No | Inherits | Streaming |
| [`applyPadLines`](#applypadlineslines-size) | 1-to-N | Add padding | No | Inherits | Temp array |
| [`applyResetOrigin`](#applyresetorigin) | 1-to-1 | Clear origins | No | Cleared | Streaming |
| [`applyFallback`](#applyfallbackfallbacks) | N-to-N | Provide fallback | No | From source | Wrapper |

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

### `rangesForPoint(position)`

Generate zero-width ranges at document boundaries.

```typescript
rangesForPoint(position: 'document-start' | 'document-end'): GenerateRanges<null, RenderOptions>
```

**Parameters:**
- `position` - Document boundary:
  - `'document-start'` - Position 0
  - `'document-end'` - Position `source.length`

**Data:** `null`

**Use cases:**
- Document-level insertion points
- Wrapping content
- Default fallback positions
- Header/footer insertion

**Example:**
```typescript
// Insert header at document start
rangesForPoint('document-start')
```

---

### `rangesFrom(input)`

Convert raw range data into `GenerateRanges` function.

```typescript
rangesFrom<Data>(
    input: RangeIterable<Data> | RangesGenerator<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `input` - Iterable of tuples `[start, end, data?]` or objects `{start, end, data?}`, OR a generator function `(source, renderOptions?) => Ranges`

**Use cases:**
- Integrating external tools (linters, parsers)
- Converting custom formats
- Testing with fixtures
- Dynamic range generation based on source

**Example:**
```typescript
// From external linter
const diagnostics = await linter.lint(source);
rangesFrom(diagnostics)

// From tuple array
rangesFrom([[0, 5], [10, 15]])

// From generator function
rangesFrom((source) => source.length > 100 ? [[0, 100]] : [])
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

### `rangesFromOptions(source)`

Get ranges from render options (user-configurable).

```typescript
rangesFromOptions<Data>(
    source: ((renderOptions: RenderOptions) => Ranges<Data, RenderOptions> | null | undefined) | keyof RenderOptions
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `source` - Either a callback function that receives render options and returns ranges, or a field name (shortcut for accessing a property)

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

### `concatRanges(...inputs)`

Combine multiple range sources into a flat list without merging.

```typescript
concatRanges<Data, RenderOptions>(
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
concatRanges(
    rangesForMatch(/ERROR/g),
    rangesForMatch(/WARNING/g),
    rangesFromLayer('diagnostics')
)
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
    rangesForPoint('document-start')
)
```

---

### `composeRanges(source, ...transformers)`

Compose a range source with multiple transformers (left-to-right).

```typescript
composeRanges<Data, RenderOptions>(
    source: Ranges<Data, RenderOptions>,
    ...transformers: Array<(input: Ranges) => GenerateRanges>
): GenerateRanges<Data, RenderOptions>
```

**Parameters:**
- `source` - Initial range source
- `transformers` - Transformation functions to apply in sequence

**Use cases:**
- Building transformation pipelines
- Combining multiple transformations
- Creating reusable compositions

**Example:**
```typescript
// Multi-step pipeline
composeRanges(
    rangesFromLayer('diagnostics'),
    applyFilter(range => range.data.severity === 'error'),
    applyExpandTo('line', 2),
    applyMerge(),
    applyFitToWindow(1000)
)
```

---

## Range Transformers

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
  - `'document-end'` - End of document (`source.length`)

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Creating insertion points
- Line/document markers
- Icon/decoration placement

**Example:**
```typescript
// Insert markers at match start
composeRanges(
    rangesForMatch(/error/g),
    applyCollapseTo('start')
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
composeRanges(
    rangesForMatch(/error/g),
    applyExpandTo('line', 2)
)

// Asymmetric context: show function body
composeRanges(
    rangesForMatch(/^function/gm),
    applyExpandTo('line', [0, 5])
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
composeRanges(
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

### `applyInvert(exact?)`

Invert ranges - returns everything NOT in input ranges. **Output ranges have no origin** (no direct connection to input).

```typescript
applyInvert(exact?: boolean): TransformRanges
```

**Parameters:**
- `exact` - Boundary behavior:
  - `true` - Bound to `[0, source.length]`
  - `false` (default) - Extend to `[0, source.length + 1]`

**Origin:** None (no connection between input and output)

**Use cases:**
- Creating viewport gaps
- Collapsible content
- Negative highlighting

**Example:**
```typescript
// Create gaps between headers for collapsing
composeRanges(
    rangesForMatch(/^#{1,6}\s/gm),
    applyExpandTo('line'),
    applyInvert()
)
```

---

### `applyFilter(predicate)`

Filter ranges using a predicate function.

```typescript
applyFilter(
    predicate: (range, index, context) => boolean
): TransformRanges
```

**Parameters:**
- `predicate` - Function receiving:
  - `range` - Full range object `{start, end, data, origin}`
  - `index` - Zero-based position in sequence
  - `context` - `{source, lines, renderOptions, ranges}`

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Conditional highlighting
- Severity filtering
- Position-based selection

**Example:**
```typescript
// Filter single-line ranges only
composeRanges(
    rangesForMatch(/\w+/g),
    applyFilter((range, i, { lines }) =>
        lines.getLine(range.start) === lines.getLine(range.end)
    )
)

// Filter by data property
composeRanges(
    diagnostics,
    applyFilter(range => range.data.severity === 'error')
)
```

---

### `applyPick(selector)`

Select a single range from input.

```typescript
applyPick(
    selector: 'first' | 'last' | ((range, index, context) => boolean)
): TransformRanges
```

**Parameters:**
- `selector` - Selection strategy:
  - `'first'` - First range in sequence
  - `'last'` - Last range in sequence
  - Function - First range matching predicate (same signature as `applyFilter`)

**Origin:** Inherits from input range (direct connection)

**Use cases:**
- Focus on first/last occurrence
- Selecting primary diagnostic
- Jump-to-definition

**Example:**
```typescript
// Show only first error
composeRanges(
    rangesForMatch(/error/g),
    applyPick('first'),
    applyExpandTo('line')
)

// Pick first error diagnostic
composeRanges(
    diagnostics,
    applyPick(range => range.data.severity === 'error')
)
```

---

### `applySort(comparator?)`

Sort ranges by custom criteria.

```typescript
applySort(
    comparator?: (rangeA, rangeB, context) => number
): TransformRanges
```

**Parameters:**
- `comparator` - Comparison function (optional):
  - Receives `rangeA`, `rangeB`, `context`
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
composeRanges(ranges, applySort())

// Sort by line number
composeRanges(
    ranges,
    applySort((a, b, { lines }) =>
        lines.getLine(a.start) - lines.getLine(b.start)
    )
)
```

---

### `applyDataMap(mapper)`

Transform range data while preserving positions. **Clears `origin` tracking** (data transformation creates new semantic meaning).

```typescript
applyDataMap<Data, NewData>(
    mapper: (range, index, context) => NewData
): TransformRanges<Data, NewData>
```

**Parameters:**
- `mapper` - Transformation function receiving:
  - `range` - Full range object
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
composeRanges(
    rangesForMatch(/(\w+)=(\w+)/g),
    applyDataMap(range => {
        const [, key, value] = range.data;
        return { key, value };
    })
)

// Add sequential IDs
composeRanges(
    ranges,
    applyDataMap((range, index) => ({
        ...range.data,
        id: `item-${index}`
    }))
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
composeRanges(
    rangesForMatch(/error/g),
    applyFitToWindow()
)

// Custom size with no trimming
composeRanges(
    rangesForMatch(/error/g),
    applyFitToWindow(120, false)
)
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
composeRanges(
    rangesForLines('line-content'),
    applyPadLines(2, 50)
)

// Add 1 before and 2 after
composeRanges(
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
composeRanges(
    ranges,
    applyExpandTo('line'),
    applyMerge(),
    applyResetOrigin()
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
composeRanges(
    rangesForMatch(/error/gi),
    applyFallback(
        rangesForMatch(/warning/gi),
        [[0, 100]]  // Show first 100 chars if nothing found
    )
)

// Insert TOC with fallback positions
composeRanges(
    rangesFromOptions('tocInsertPoint'),
    applyFallback(
        rangesForMatch(/^(?=#[^#])/m),  // Before first H1
        [[0, 0]]  // Document start
    )
)
```

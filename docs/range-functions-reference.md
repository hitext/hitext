# Range Functions Reference

Implementation reference for range function API design, core concepts, design principles and patterns, implementation requirements.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Range Sources](#range-sources)
- [Range Transformers](#range-transformers)
- [Core Concepts](#core-concepts)
- [Design Principles](#design-principles)
- [Implementation Requirements](#implementation-requirements)
- [Implementation Procedure](#implementation-procedure)

## Quick Reference

### Range Sources

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

### Range Transformers

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
| [`applyFitToWindow`](#applyfittowindowsize-allowtrimming) | N-to-N | Horizontal viewport | No | Inherits | Temp array |
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

## Core Concepts

**Range structure:**
- `start` - Starting offset in source text
- `end` - Ending offset in source text  
- `data` - Optional metadata (match results, diagnostics, custom info)
- `origin` - Optional transformation lineage tracking (see Origin Tracking below)

**Origin tracking:**
- Type: `RangeRecord<Data> | RangeRecord<Data>[] | undefined`
- Purpose: Maintain reference to source range(s) through transformations
- **Set only for derivative ranges** - Original ranges from sources have `origin: undefined`
- Use cases:
  - **Injection context** - When collapsing to insertion points, origin shows what range triggered the injection and its position
  - **Content generation** - Access source data when generating summaries, TOCs, or derived content (e.g., merged headers → TOC entries)
  - **Viewport understanding** - Know which part of original range is visible after framing/fitting operations
- Automatically managed by transformers according to transformation semantics (see Design Principle #7)

**Function categories:**
- **Range Sources** (`ranges*`) - Generate/provide ranges, return `GenerateRanges<Data, RenderOptions>`
- **Range Transformers** (`apply*`) - Transform ranges, curried, return `(input: Ranges) => GenerateRanges`

**Context objects:**
- `GenerateRangesContext` - Available in range source/transformer implementation: `{renderOptions, marker, ranges, rangesByMarker, rangesByName, lines}`
- `RangeOperationContext` - Available in predicate callbacks (filter, map, sort): `{source, lines, renderOptions, ranges}`
- Both provide access to `lines` (LineBoundaries) for on-demand metric computation

---


---

## Design Principles

### 1. Composability First

Functions work together via `composeRanges()` for left-to-right composition. Enables readable pipelines.

### 2. Currying for Transformers

Transformers use currying to enable parameter binding before composition:
```typescript
applyExpandTo('line', 2)  // Returns function ready for composition
```

### 3. Semantic Naming

- `ranges*` = sources (generate/provide ranges)
- `apply*` = transformers (modify existing ranges)
- Clear, descriptive parameter names

### 4. Explicit over Implicit

Function behavior is obvious from name and parameters.

### 5. Immutability

Input ranges are never mutated. Transformations always create new range objects, preserving the original as `origin`:

```typescript
// ✅ Correct: Create new range with origin
createRange(newStart, newEnd, range.data, range.origin || range)

// ❌ Wrong: Mutate input range
range.start = newStart;
range.end = newEnd;
```

**Why:** Enables safe composition, predictable behavior, and transformation tracking.

### 6. Memory Efficiency for 1-to-1 Transformers

Transformers that maintain 1-to-1 input-output mapping should stream ranges without creating temporary arrays:

```typescript
// ✅ Correct: Stream through processRanges wrapper
return (source, createRange, context) => {
    processRanges(source, input, (start, end, data, origin) => {
        createRange(newStart, newEnd, data, origin || { start, end, data });
    }, context);
};

// ❌ Wrong: Collect all ranges in memory
const ranges: Array<RangeRecord<Data>> = [];
processRanges(source, input, (start, end, data, origin) => {
    ranges.push({ start, end, data, origin });
}, context);
ranges.forEach(range => createRange(...));
```

**Exception:** Functions with predicate callbacks need temporary arrays to provide stable `context.ranges` parameter (e.g., `applyFilter`, `applyDataMap`, `applySort`).

**Why:** Avoids memory overhead for large range sets, enables true streaming pipelines.

### 7. Origin Tracking

Transformations preserve range lineage via `origin` field. **Original ranges from sources have `origin: undefined`** - only derivative ranges carry origin references.

Transformer behavior:
- **Has origin:** Resulting range inherits it unchanged
- **No origin (original range):** Input range becomes origin for result
- **No connection:** Output ranges have no origin (e.g., `applyInvert`)
- **Merge operation:** Origin is array of merged ranges (e.g., `applyMerge`)

This enables access to source ranges for functional composition (e.g., generating summaries from merged items).

### 8. Consistent Predicate Signatures

Functions accepting predicates follow consistent parameter patterns:
- **Single range operations**: `(range, index, context) => result`
- **Range comparisons**: `(rangeA, rangeB, context) => result`

Where:
- `range` - Full range object `{start, end, data, origin}`
- `index` - Zero-based position
- `context` - `{source, lines, renderOptions, ranges}`

**Examples:**
```typescript
// Filter: (range, index, context) => boolean
applyFilter((range, index, { lines }) =>
    lines.getLine(range.start) === lines.getLine(range.end)
)

// Map: (range, index, context) => newData
applyDataMap((range, index) => ({
    ...range.data,
    id: `item-${index}`
}))

// Sort: (rangeA, rangeB, context) => number
applySort((a, b, { lines }) =>
    lines.getLine(a.start) - lines.getLine(b.start)
)
```

### 9. Compute Metrics On-Demand

Avoid storing line boundary metrics (line numbers, columns) in `range.data` unless absolutely required. Compute on-demand from `context.lines`:
- **Range sources/transformers**: `GenerateRanges` callback receives `context` with `lines`
- **Range operation callbacks**: Predicates receive `context` with `lines`
- **Render hooks**: Pre-computed `line`/`column` properties available

**Why:** Line calculations are fast. Storing bloats data and creates redundancy.

**❌ Avoid:**
```typescript
applyDataMap((range, index, { lines }) => ({
    ...range.data,
    line: lines.getLine(range.start),      // Unnecessary
    column: lines.getColumn(range.start)   // Unnecessary
}))
```

**Exception:** Store only when serializing outside render pipeline (API responses, external tools).

---

## Implementation Requirements

### File Structure

**Locations:**
- **Range Sources** (`ranges*`) → `src/range-sources/<function-name>.ts`
- **Range Transformers** (`apply*`) → `src/range-compose/<function-name>.ts`

**Filenames:** kebab-case conversion from camelCase
- `applyExpandTo` → `apply-expand-to.ts`
- `rangesForMatch` → `ranges-for-match.ts`

**Exports:**
- `src/range-sources/index.ts` or `src/range-compose/index.ts` (barrel exports)
- `src/index.ts` (public API)

### JSDoc Template

```typescript
/**
 * Brief one-line summary of function purpose.
 * 
 * Optional longer description explaining behavior, edge cases, or important details.
 * Use this section to clarify non-obvious aspects.
 *
 * @param paramName - Description of parameter, including:
 *   - Valid values/types
 *   - Default values (if any)
 *   - Special behaviors
 * @returns Description of return value
 *
 * @example
 * // Descriptive comment for this use case
 * const result = functionName(args)
 *
 * @example
 * // Only add more examples if truly different use cases
 * const other = functionName(otherArgs)
 */
```

**Required:**
- Brief summary (imperative mood: "Creates...", "Filters...", "Merges...")
- ALL parameters documented
- Return value described
- At least one `@example` with typical usage
- Important behaviors noted (origin tracking, memory, edge cases)

### Test Structure

**File location:** Mirror source structure
- `src/range-compose/apply-expand-to.ts` → `test/range-compose/apply-expand-to.test.ts`

**Imports:** Public API only (`src/index.ts` or `src/types.d.ts`)

**Template:**
```typescript
import { deepStrictEqual } from 'assert';
import { functionName, generateRanges } from '../../src/index.js';  // Public API only
import { renderRanges, startEnd, startEndData, rangeWithoutMarker } from '../utils.js';

describe('functionName', () => {
    // Test isolated behavior only - don't test general patterns
    
    it('should handle basic case', () => {
        // Using generateRanges - assert exact start/end positions
        const source = 'Hello World';
        const ranges = generateRanges(source, fn());
        deepStrictEqual(startEnd(ranges), [
            [0, 5],
            [10, 15]
        ]);
    });
    
    it('should transform correctly', () => {
        // Using renderRanges - assert by rendered text (more descriptive)
        const source = 'Hello World';
        const output = renderRanges(source, fn());
        deepStrictEqual(output, [
            'Hello',
            'World'
        ]);
    });
    
    // More specific cases...
});
```

**Required coverage:**
- Edge cases: `[]`, `[[0, 5]]`, `[[5, 5]]`, document boundaries
- Enum parameters: Each value tested (dedicated `describe()` or grouped)
- Predicate functions: All parameters verified (single test)
- Single assertion for range sets (preferred)
- Focus on function-specific logic only

**Helper utilities** (`test/utils.ts`):
- `generateRanges()` - Assert `start`/`end`/`data`/`origin`
- `renderRanges()` - Assert by text output
- `startEnd()` / `startEndData()` - Simplified assertions
- `rangeWithoutMarker()` - Ignore markers
- `regexpMatch()` - Pattern matching tests

### Signature Patterns

**Range sources return `GenerateRanges`:**
```typescript
// Sources directly return GenerateRanges function
export function rangesForSomething(param: Type): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, context) => {
        // Generate ranges by calling createRange(start, end, data, origin)
    };
}
```

**Currying for transformers:**
```typescript
// Transformers return a function that accepts input and returns GenerateRanges
export function applyTransform(param: Type): TransformRanges {
    return (input: Ranges) => {
        return (source, createRange, context) => {
            // Transform input ranges, calling createRange for each output
        };
    };
}
```

**Predicates must follow consistent signatures:**

```typescript
// Single range operations (filter, map, pick)
(range: RangeRecord<Data>, index: number, context: RangeOperationContext) => result

// Range comparisons (sort)
(rangeA: RangeRecord<Data>, rangeB: RangeRecord<Data>, context: RangeOperationContext) => number
```

### Documentation Sync

When adding, updating, removing, or renaming a range function, the following sections of this document must be kept in sync:

**For new/updated functions:**

1. **Quick Reference Table** (either "Range Sources" or "Range Transformers")
   - Add/update row with: function name (linked to section), type, description, modifies data flag, origin behavior, implementation pattern
   - Ensure correct category: Source, Combiner, Composer, or Transformer
   - Specify transform type: 1-to-1, 1-to-N, N-to-1, N-to-N, N-to-M
   - Implementation: Streaming, Temp array, Temp array*, Wrapper

2. **Function Section** (either "Range Sources" or "Range Transformers")
   - Add/update complete documentation:
     - Section heading with function name and parameters
     - TypeScript signature (all overloads)
     - Parameters section (all valid values, defaults, behaviors)
     - Data field description (what's stored)
     - Origin behavior explanation
     - Use cases (rational number of bullet points)
     - Examples in fenced code blocks

3. **Design Principles** (if applicable)
   - Add new principle if function introduces fundamental pattern
   - Update existing principles if behavior/recommendations change

4. **Core Concepts** (if applicable)
   - Update if function introduces new concepts, types, or patterns

**For removed functions:**
- Remove from Quick Reference Table
- Remove function section
- Review Design Principles and Core Concepts for outdated references

**For renamed functions:**
- Update all occurrences throughout document
- Update Quick Reference Table (name and link)
- Update function section heading
- Check all code examples in other sections

---

## Implementation Procedure

Follow these steps when creating or updating range functions.

### 1. Create Implementation File

1. Choose location based on function type:
   - **Source** → `src/range-sources/<function-name>.ts`
   - **Transformer** → `src/range-compose/<function-name>.ts`
2. Convert camelCase to kebab-case for filename
3. Implement with proper signature pattern (see Implementation Requirements)
4. Add JSDoc following template (see Implementation Requirements)

### 2. Update Exports

1. Add to barrel export: `src/range-sources/index.ts` or `src/range-compose/index.ts`
2. Add to public API: `src/index.ts` (if part of public API)

### 3. Write Tests

1. Create test file mirroring source location: `test/<category>/<function-name>.test.ts`
2. Import only from public API (`src/index.ts`)
3. Follow test template (see Implementation Requirements)
4. Cover required edge cases
5. Run tests: `npm test`

### 4. Validate Code Quality

Run validation commands:
```bash
npm test              # Run source unit tests
npm run lint:fix      # Lint with autofix
npm run typecheck     # TypeScript type check
```

### 5. Update Documentation

Update `docs/range-functions-reference.md`:

1. **Quick Reference Table**
   - Add row with: name (linked), type, description, modifies data, origin behavior, implementation
   - Category: Source, Combiner, Composer, or Transformer
   - Transform type: 1-to-1, N-to-1, N-to-N, N-to-M, 1-to-N
   - Implementation: Streaming, Temp array, Temp array*, Wrapper

2. **Function Section**
   - TypeScript signature with all overloads
   - Parameters (all valid values, defaults, behaviors)
   - Origin behavior explanation
   - Use cases (3-4 bullet points)
   - Examples in fenced code blocks

3. **Design Principles** (if applicable)
   - Add new principle if introducing fundamental pattern
   - Update existing if behavior changes

4. **Core Concepts** (if applicable)
   - Update if introducing new concepts or types

### 6. Final Validation

Before committing, run full validation:
```bash
npm run check         # Full validation:
                      # - Lint with autofix
                      # - Source unit tests (test/)
                      # - TypeScript type check
                      # - Transpile/bundle/emit types
                      # - Run tests for ESM/CJS builds
                      # - Test bundles
```

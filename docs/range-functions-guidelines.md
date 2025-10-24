# Range Functions Guidelines

This document specifies implementation requirements and procedures for range functions, and provides detailed guidelines on implementing, testing, and documenting range functions.

See [Range Functions Reference](range-functions-reference.md) for the complete API reference for range functions, including signatures, parameters, return types, use cases, and examples.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Design Principles](#design-principles)
- [Implementation Requirements](#implementation-requirements)
- [Implementation Procedure](#implementation-procedure)

## Core Concepts

**Range structure:**
- `start` - Starting offset in document text
- `end` - Ending offset in document text  
- `data` - Optional metadata (match results, diagnostics, custom info)
- `origin` - Optional transformation lineage tracking (see Origin Tracking below)

**Origin tracking:**
- Type: `RangeRecord<Data> | RangeRecord<Data>[] | undefined`
- Purpose: Maintain reference to **root source range(s)**, not intermediate transformation steps
- **Points to transformation root** - Origin tracks the original range that started the transformation chain, not the previous step. The pattern `origin || { start, end, data }` preserves the root through multiple transformations.
- **Set only for derivative ranges** - Original ranges from sources have `origin: undefined`
- Use cases:
  - **Injection context** - When collapsing to insertion points, origin shows what range triggered the injection and its original position/data
  - **Content generation** - Access source data when generating summaries, TOCs, or derived content (e.g., merged headers → TOC entries with original header data)
  - **Viewport understanding** - Know which part of original range is visible after framing/fitting operations
  - **Root access** - Direct access to transformation root without traversing chain
- Automatically managed by transformers according to transformation semantics (see Design Principle #7)

**Function categories:**
- **Range Sources** (`ranges*`) - Generate/provide ranges, return `GenerateRanges<Data, RenderOptions>`
- **Range Transformers** (`apply*`) - Transform ranges, curried, return `(input: Ranges) => GenerateRanges`

**Context objects:**
- `GenerateRangesContext` - Available in range source/transformer implementation: `{renderOptions, marker, ranges, rangesByMarker, rangesByName, lines}`
- `RangeOperationContext` - Available in predicate callbacks (filter, map, sort): `{document, lines, renderOptions, ranges, index}` where `index` is a lazy getter for the current range's zero-based position
- Both provide access to `lines` (LineBoundaries) for on-demand metric computation

---

## Design Principles

### 1. Composability First

Functions work together via `rangesCompose()` for left-to-right composition. Enables readable pipelines.

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
return (document, createRange, context) => {
    processRanges(document, input, (start, end, data, origin) => {
        createRange(newStart, newEnd, data, origin || { start, end, data });
    }, context);
};

// ❌ Wrong: Collect all ranges in memory
const ranges: Array<RangeRecord<Data>> = [];
processRanges(document, input, (start, end, data, origin) => {
    ranges.push({ start, end, data, origin });
}, context);
ranges.forEach(range => createRange(...));
```

**Exception:** Functions with predicate callbacks need temporary arrays to provide stable `context.ranges` parameter (e.g., `applyFilter`, `applyDataMap`, `applySort`).

**Why:** Avoids memory overhead for large range sets, enables true streaming pipelines.

### 7. Origin Tracking

Transformations preserve range lineage via `origin` field, which points to the **transformation root**, not intermediate steps. **Original ranges from sources have `origin: undefined`** - only derivative ranges carry origin references.

**The root preservation pattern:**
```typescript
// ✅ Correct: Preserve root through chain
createRange(newStart, newEnd, data, origin || { start, end, data });

// This means:
// - If origin exists → keep it (points to root)
// - If no origin → current range becomes root
// Never creates origin.origin.origin... chains
```

**Transformer origin behaviors:**

- **Inherits (most transformers):** Uses pattern above - `origin || { start, end, data }` preserves root through transformation chain (e.g., `applyExpandTo`, `applyCollapseTo`, `applyFilter`)

- **Cleared (data transformations):** Sets `origin = undefined` - the transformed range becomes a new root. Used when data is semantically transformed and the result IS the new source of truth. Example: `applyDataMap()` creates new data with same position as origin - keeping origin would point to obsolete data. If original data is needed, carry it forward explicitly in new data structure.

- **Array (merge operations):** Origin is array of all merged source ranges - enables access to individual items when multiple ranges combine into one (e.g., `applyMerge()` for generating summaries from merged headers)

- **None (inversions):** No origin - output ranges have no relationship to input ranges (e.g., `applyInvert()` returns gaps, not derivatives)

**Why preserve root, not previous step:**
- Enables direct access to transformation source without traversing chain
- Use cases: access original match data after expansion, know source position after viewport fitting, generate content from root data
- Memory efficient: single reference vs linked list

This enables access to source ranges for functional composition (e.g., generating TOC from merged headers via `range.origin.map(...)`).

### 8. Consistent Callback Signatures

Functions accepting callbacks follow consistent parameter patterns for predictable APIs:

**Single range operations (filter, pick, data transforms):**
```typescript
(range: RangeRecord<Data>, context: RangeOperationContext) => result
```

**Range mapping (1-to-N transforms with createRange):**
```typescript
(range: RangeRecord<Data>, createRange: CreateRange, context: RangeOperationContext) => void
```

**Range comparisons (sort):**
```typescript
(rangeA: RangeRecord<Data>, rangeB: RangeRecord<Data>, context: RangeOperationContext) => number
```

Where:
- `range` - Full range object `{start, end, data, origin}`
- `createRange` - Function to emit output ranges (for mapping operations)
- `context` - `{document, lines, renderOptions, ranges, index}` where `index` is a lazy getter
- Returns: appropriate type for operation (boolean for filter, data for map, number for sort, void for createRange)

**Examples:**
```typescript
// Filter: (range, context) => boolean
applyFilter((range, { lines }) =>
    lines.getLine(range.start) === lines.getLine(range.end)
)

// Map: (range, createRange, context) => void
applyMap((range, createRange, { lines }) => {
    createRange(range.start, range.end, { 
        line: lines.getLine(range.start)
    });
    // origin set automatically to range.origin || range
})

// Data map: (range, context) => newData
applyDataMap((range, { index }) => ({
    ...range.data,
    id: `item-${index}`
}))

// Sort: (rangeA, rangeB, context) => number
applySort((a, b, { lines }) =>
    lines.getLine(a.start) - lines.getLine(b.start)
)
```

**Parameter ordering rationale:**
- `range` first - the subject of operation
- `createRange` before `context` - primary tool for result emission (mapping operations)
- `context` last - supplementary information, often destructured

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

### 10. Mapping Functions: `createRange` Pattern

Mapping functions (1-to-N transforms) receive `createRange` callback for emitting output ranges. This pattern avoids array allocation overhead and provides ergonomic conditional logic.

**Pattern:**
```typescript
applyMap((range, createRange, context) => {
    // Emit 0, 1, or many ranges by calling createRange
    if (condition) createRange(start1, end1, data1);
    if (other) createRange(start2, end2, data2);
    // Origin automatically set to: range.origin || range
})
```

**Benefits:**
- **No garbage collection overhead** - No intermediate arrays created
- **Ergonomic conditionals** - Natural if/else without array manipulation
- **Automatic origin tracking** - All emitted ranges automatically get `origin = range.origin || range`
- **Streaming friendly** - Ranges flow through pipeline without buffering

**Specialized wrappers:**
- `applyAugment()` - Convenience wrapper that automatically emits original range first, then calls user function for additional ranges
- `applyDataMap()` - 1-to-1 data transform that preserves positions, clears origin (new semantic root)

**Why automatic origin:**
- All mapped outputs ARE derivatives of input - that's the semantic of mapping
- Prevents user errors (forgetting or incorrectly setting origin)
- User focus on transformation logic, not plumbing

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
 * // Concise semantic reference showing call pattern
 * rangesCompose(..., functionName(args))
 */
```

**Required:**
- Brief summary (imperative mood: "Creates...", "Filters...", "Merges...")
- ALL parameters documented
- Return value described
- **One or more `@example` blocks showing semantic usage** (see below)
- Important behaviors noted (origin tracking, memory, edge cases)

**CRITICAL - Example Requirements:**

Examples are **quick semantic reference** (shown in tooltips), NOT tutorials or documentation:

- ✅ **Minimal examples** - typically one, occasionally 2-3 if showing truly unique semantics
- ✅ **Use `...` for irrelevant context** - replace parts that don't contribute to understanding
- ✅ **Multiline format for transforms** - always use multiline format for readability
- ✅ **Show semantic meaning** - what the function does, not implementation variations
- ✅ **Concise** - typically 3-5 lines per example

**When to use `...` vs named variables:**

✅ **Good - use `...` when source doesn't matter:**
```typescript
rangesCompose(
  ...,
  applyFilter((range, { lines }) =>
    lines.getLine(range.start) < 10
  )
)
```

✅ **Good - keep named variable when it provides semantic context:**
```typescript
rangesCompose(
  rangesForMatch(/\w+/g),
  applyFilter((range) => range.data[0] === 'hello')  // uses match data
)
```

❌ **Bad - keeps source but doesn't use its specific data:**
```typescript
rangesCompose(
  rangesForMatch(/\w+/g),  // ❌ irrelevant - match data not used
  applyFilter((range, { lines }) =>
    lines.getLine(range.start) < 10
  )
)
```

**When to add multiple examples:**

- ✅ **Different parameter types** (e.g., `applyPick('first')` vs `applyPick(predicate)`)
- ✅ **Different parameter forms** (e.g., `applyExpandTo('line', 2)` vs `applyExpandTo('line', [1, 3])`)
- ✅ **Optional parameters with significant behavior change** (e.g., `applySort()` vs `applySort(comparator)`)
- ❌ **NOT for using different range properties** (data vs lines vs index - all show same pattern)
- ❌ **NOT for parameter value variations** (different regex, different field names, different numbers)
- ❌ **NOT for different input sources** (unless source provides semantic context)

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
        const document = 'Hello World';
        const ranges = generateRanges(document, fn());
        deepStrictEqual(startEnd(ranges), [
            [0, 5],
            [10, 15]
        ]);
    });
    
    it('should transform correctly', () => {
        // Using renderRanges - assert by rendered text (more descriptive)
        const document = 'Hello World';
        const output = renderRanges(document, fn());
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
    return (document, createRange, context) => {
        // Generate ranges by calling createRange(start, end, data, origin)
    };
}
```

**Currying for transformers:**
```typescript
// Transformers return a function that accepts input and returns GenerateRanges
export function applyTransform(param: Type): TransformRanges {
    return (input: Ranges) => {
        return (document, createRange, context) => {
            // Transform input ranges, calling createRange for each output
        };
    };
}
```

**Predicates must follow consistent signatures:**

```typescript
// Single range operations (filter, pick, data transforms)
(range: RangeRecord<Data>, context: RangeOperationContext) => result

// Range mapping (1-to-N with createRange)
(range: RangeRecord<Data>, createRange: CreateRange, context: RangeOperationContext) => void

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

1. [**Quick Reference Table**](range-functions-reference.md#quick-reference)
   - Add row with: name (linked), type, description, modifies data, origin behavior, implementation
   - Category: Source, Combiner, Composer, or Transformer
   - Transform type: 1-to-1, N-to-1, N-to-N, N-to-M, 1-to-N
   - Implementation: Streaming, Temp array, Temp array*, Wrapper

2. **Function Section** ([Range Sources](range-functions-reference.md#range-sources) or [Range Transformers](range-functions-reference.md#range-transformers))
   - TypeScript signature with all overloads
   - Parameters (all valid values, defaults, behaviors)
   - Origin behavior explanation
   - Use cases (3-4 bullet points)
   - Examples in fenced code blocks

3. [**Design Principles**](range-functions-guidelines.md#design-principles) (if applicable)
   - Add new principle if introducing fundamental pattern
   - Update existing if behavior changes

4. [**Core Concepts**](range-functions-guidelines.md#core-concepts) (if applicable)
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

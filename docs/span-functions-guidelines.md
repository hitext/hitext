# Span Functions Guidelines

This document specifies implementation requirements and procedures for span functions, and provides detailed guidelines on implementing, testing, and documenting span functions.

See [Span Functions Reference](span-functions-reference.md) for the complete API reference for span functions, including signatures, parameters, return types, use cases, and examples.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Design Principles](#design-principles)
- [Implementation Requirements](#implementation-requirements)
- [Implementation Procedure](#implementation-procedure)

## Core Concepts

**Span structure:**
- `start` - Starting offset in document text
- `end` - Ending offset in document text  
- `data` - Optional metadata (match results, diagnostics, custom info)
- `origin` - Optional transformation lineage tracking (see Origin Tracking below)

**Origin tracking:**
- Type: `SpanRecord<Data> | SpanRecord<Data>[] | undefined`
- Purpose: Maintain reference to **root source span(s)**, not intermediate transformation steps
- **Points to transformation root** - Origin tracks the original span that started the transformation chain, not the previous step. The pattern `origin || { start, end, data }` preserves the root through multiple transformations.
- **Set only for derivative spans** - Original spans from sources have `origin: undefined`
- Use cases:
  - **Injection context** - When collapsing to insertion points, origin shows what span triggered the injection and its original position/data
  - **Content generation** - Access source data when generating summaries, TOCs, or derived content (e.g., merged headers → TOC entries with original header data)
  - **Viewport understanding** - Know which part of original span is visible after framing/fitting operations
  - **Root access** - Direct access to transformation root without traversing chain
- Automatically managed by transformers according to transformation semantics (see Design Principle #7)

**Function categories:**
- **Span Sources** (`spans*`) - Generate/provide spans, return `GenerateSpans<Data, RenderOptions>`
- **Span Transformers** (`apply*`) - Transform spans, curried, return `(input: SpansSource) => GenerateSpans`

**Context objects:**
- `GenerateSpansContext` - Available in span source/transformer implementation: `{renderOptions, marker, spans, spansByMarker, spansByName, lines}`
- `SpanOperationContext` - Available in predicate callbacks (filter, map, sort): `{document, lines, renderOptions, spans, index}` where `index` is a lazy getter for the current span's zero-based position
- Both provide access to `lines` (LineBoundaries) for on-demand metric computation

---

## Design Principles

### 1. Composability First

Functions work together via `spansCompose()` for left-to-right composition. Enables readable pipelines.

### 2. Currying for Transformers

Transformers use currying to enable parameter binding before composition:
```typescript
applyExpandTo('line', 2)  // Returns function ready for composition
```

### 3. Semantic Naming

- `spans*` = sources (generate/provide spans)
- `apply*` = transformers (modify existing spans)
- Clear, descriptive parameter names

### 4. Explicit over Implicit

Function behavior is obvious from name and parameters.

### 5. Immutability

Input spans are never mutated. Transformations always create new span objects, preserving the original as `origin`:

```typescript
// ✅ Correct: Create new span with origin
createSpan(newStart, newEnd, span.data, span.origin || span)

// ❌ Wrong: Mutate input span
span.start = newStart;
span.end = newEnd;
```

**Why:** Enables safe composition, predictable behavior, and transformation tracking.

### 6. Memory Efficiency for 1-to-1 Transformers

Transformers that maintain 1-to-1 input-output mapping should stream spans without creating temporary arrays:

```typescript
// ✅ Correct: Stream through processSpans wrapper
return (document, createSpan, context) => {
    processSpans(document, input, (start, end, data, origin) => {
        createSpan(newStart, newEnd, data, origin || { start, end, data });
    }, context);
};

// ❌ Wrong: Collect all spans in memory
const spans: Array<SpanRecord<Data>> = [];
processSpans(document, input, (start, end, data, origin) => {
    spans.push({ start, end, data, origin });
}, context);
spans.forEach(span => createSpan(...));
```

**Exception:** Functions with predicate callbacks need temporary arrays to provide stable `context.spans` parameter (e.g., `applyFilter`, `applyDataMap`, `applySort`).

**Why:** Avoids memory overhead for large span sets, enables true streaming pipelines.

### 7. Origin Tracking

Transformations preserve span lineage via `origin` field, which points to the **transformation root**, not intermediate steps. **Original spans from sources have `origin: undefined`** - only derivative spans carry origin references.

**The root preservation pattern:**
```typescript
// ✅ Correct: Preserve root through chain
createSpan(newStart, newEnd, data, origin || { start, end, data });

// This means:
// - If origin exists → keep it (points to root)
// - If no origin → current span becomes root
// Never creates origin.origin.origin... chains
```

**Transformer origin behaviors:**

- **Inherits (most transformers):** Uses pattern above - `origin || { start, end, data }` preserves root through transformation chain (e.g., `applyExpandTo`, `applyCollapseTo`, `applyFilter`)

- **Cleared (data transformations):** Sets `origin = undefined` - the transformed span becomes a new root. Used when data is semantically transformed and the result IS the new source of truth. Example: `applyDataMap()` creates new data with same position as origin - keeping origin would point to obsolete data. If original data is needed, carry it forward explicitly in new data structure.

- **Array (merge operations):** Origin is array of all merged source spans - enables access to individual items when multiple spans combine into one (e.g., `applyMerge()` for generating summaries from merged headers)

- **None (inversions):** No origin - output spans have no relationship to input spans (e.g., `applyInvert()` returns gaps, not derivatives)

**Why preserve root, not previous step:**
- Enables direct access to transformation source without traversing chain
- Use cases: access original match data after expansion, know source position after viewport fitting, generate content from root data
- Memory efficient: single reference vs linked list

This enables access to source spans for functional composition (e.g., generating TOC from merged headers via `span.origin.map(...)`).

### 8. Consistent Callback Signatures

Functions accepting callbacks follow consistent parameter patterns for predictable APIs:

**Single span operations (filter, pick, data transforms):**
```typescript
(span: SpanRecord<Data>, context: SpanOperationContext) => result
```

**Span mapping (1-to-N transforms with createSpan):**
```typescript
(span: SpanRecord<Data>, createSpan: CreateSpan, context: SpanOperationContext) => void
```

**Span comparisons (sort):**
```typescript
(spanA: SpanRecord<Data>, spanB: SpanRecord<Data>, context: SpanOperationContext) => number
```

Where:
- `span` - Full span object `{start, end, data, origin}`
- `createSpan` - Function to emit output spans (for mapping operations)
- `context` - `{document, lines, renderOptions, spans, index}` where `index` is a lazy getter
- Returns: appropriate type for operation (boolean for filter, data for map, number for sort, void for createSpan)

**Examples:**
```typescript
// Filter: (span, context) => boolean
applyFilter((span, { lines }) =>
    lines.getLine(span.start) === lines.getLine(span.end)
)

// Map: (span, createSpan, context) => void
applyMap((span, createSpan, { lines }) => {
    createSpan(span.start, span.end, { 
        line: lines.getLine(span.start)
    });
    // origin set automatically to span.origin || span
})

// Data map: (span, context) => newData
applyDataMap((span, { index }) => ({
    ...span.data,
    id: `item-${index}`
}))

// Sort: (spanA, spanB, context) => number
applySort((a, b, { lines }) =>
    lines.getLine(a.start) - lines.getLine(b.start)
)
```

**Parameter ordering rationale:**
- `span` first - the subject of operation
- `createSpan` before `context` - primary tool for result emission (mapping operations)
- `context` last - supplementary information, often destructured

### 9. Compute Metrics On-Demand

Avoid storing line boundary metrics (line numbers, columns) in `span.data` unless absolutely required. Compute on-demand from `context.lines`:
- **Span sources/transformers**: `GenerateSpans` callback receives `context` with `lines`
- **Span operation callbacks**: Predicates receive `context` with `lines`
- **Render hooks**: Pre-computed `line`/`column` properties available

**Why:** Line calculations are fast. Storing bloats data and creates redundancy.

**❌ Avoid:**
```typescript
applyDataMap((span, index, { lines }) => ({
    ...span.data,
    line: lines.getLine(span.start),      // Unnecessary
    column: lines.getColumn(span.start)   // Unnecessary
}))
```

**Exception:** Store only when serializing outside render pipeline (API responses, external tools).

---

### 10. Mapping Functions: `createSpan` Pattern

Mapping functions (1-to-N transforms) receive `createSpan` callback for emitting output spans. This pattern avoids array allocation overhead and provides ergonomic conditional logic.

**Pattern:**
```typescript
applyMap((span, createSpan, context) => {
    // Emit 0, 1, or many spans by calling createSpan
    if (condition) createSpan(start1, end1, data1);
    if (other) createSpan(start2, end2, data2);
    // Origin automatically set to: span.origin || span
})
```

**Benefits:**
- **No garbage collection overhead** - No intermediate arrays created
- **Ergonomic conditionals** - Natural if/else without array manipulation
- **Automatic origin tracking** - All emitted spans automatically get `origin = span.origin || span`
- **Streaming friendly** - SpansSource flow through pipeline without buffering

**Specialized wrappers:**
- `applyAugment()` - Convenience wrapper that automatically emits original span first, then calls user function for additional spans
- `applyDataMap()` - 1-to-1 data transform that preserves positions, clears origin (new semantic root)

**Why automatic origin:**
- All mapped outputs ARE derivatives of input - that's the semantic of mapping
- Prevents user errors (forgetting or incorrectly setting origin)
- User focus on transformation logic, not plumbing

---

## Implementation Requirements

### File Structure

**Locations:**
- **Span Sources** (`spans*`) → `src/span-sources/<function-name>.ts`
- **Span Transformers** (`apply*`) → `src/span-compose/<function-name>.ts`

**Filenames:** kebab-case conversion from camelCase
- `applyExpandTo` → `apply-expand-to.ts`
- `spansFromMatch` → `spans-from-match.ts`

**Exports:**
- `src/span-sources/index.ts` or `src/span-compose/index.ts` (barrel exports)
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
 * spansCompose(..., functionName(args))
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
spansCompose(
  ...,
  applyFilter((span, { lines }) =>
    lines.getLine(span.start) < 10
  )
)
```

✅ **Good - keep named variable when it provides semantic context:**
```typescript
spansCompose(
  spansFromMatch(/\w+/g),
  applyFilter((span) => span.data[0] === 'hello')  // uses match data
)
```

❌ **Bad - keeps source but doesn't use its specific data:**
```typescript
spansCompose(
  spansFromMatch(/\w+/g),  // ❌ irrelevant - match data not used
  applyFilter((span, { lines }) =>
    lines.getLine(span.start) < 10
  )
)
```

**When to add multiple examples:**

- ✅ **Different parameter types** (e.g., `applyPick('first')` vs `applyPick(predicate)`)
- ✅ **Different parameter forms** (e.g., `applyExpandTo('line', 2)` vs `applyExpandTo('line', [1, 3])`)
- ✅ **Optional parameters with significant behavior change** (e.g., `applySort()` vs `applySort(comparator)`)
- ❌ **NOT for using different span properties** (data vs lines vs index - all show same pattern)
- ❌ **NOT for parameter value variations** (different regex, different field names, different numbers)
- ❌ **NOT for different input sources** (unless source provides semantic context)

### Test Structure

**File location:** Mirror source structure
- `src/span-compose/apply-expand-to.ts` → `test/span-compose/apply-expand-to.test.ts`

**Imports:** Public API only (`src/index.ts` or `src/types.d.ts`)

**Template:**
```typescript
import { deepStrictEqual } from 'assert';
import { functionName, generateSpans } from '../../src/index.js';  // Public API only
import { renderSpans, startEnd, startEndData, spanWithoutMarker } from '../utils.js';

describe('functionName', () => {
    // Test isolated behavior only - don't test general patterns
    
    it('should handle basic case', () => {
        // Using generateSpans - assert exact start/end positions
        const document = 'Hello World';
        const spans = generateSpans(document, fn());
        deepStrictEqual(startEnd(spans), [
            [0, 5],
            [10, 15]
        ]);
    });
    
    it('should transform correctly', () => {
        // Using renderSpans - assert by rendered text (more descriptive)
        const document = 'Hello World';
        const output = renderSpans(document, fn());
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
- Single assertion for span sets (preferred)
- Focus on function-specific logic only

**Helper utilities** (`test/utils.ts`):
- `generateSpans()` - Assert `start`/`end`/`data`/`origin`
- `renderSpans()` - Assert by text output
- `startEnd()` / `startEndData()` - Simplified assertions
- `spanWithoutMarker()` - Ignore markers
- `regexpMatch()` - Pattern matching tests

### Signature Patterns

**Span sources return `GenerateSpans`:**
```typescript
// Sources directly return GenerateSpans function
export function spansFromSomething(param: Type): GenerateSpans<Data, RenderOptions> {
    return (document, createSpan, context) => {
        // Generate spans by calling createSpan(start, end, data, origin)
    };
}
```

**Currying for transformers:**
```typescript
// Transformers return a function that accepts input and returns GenerateSpans
export function applyTransform(param: Type): TransformSpans<InputData, RenderOptions, OutputData> {
    return (input: SpansSource) => {
        return (document, createSpan, context) => {
            // Transform input spans, calling createSpan for each output
        };
    };
}
```

Use the third `TransformSpans` generic when output data differs from input data. Origin data remains `unknown` because a derivative may preserve a root created before a data-changing transformation.

**Predicates must follow consistent signatures:**

```typescript
// Single span operations (filter, pick, data transforms)
(span: SpanRecord<Data>, context: SpanOperationContext) => result

// Span mapping (1-to-N with createSpan)
(span: SpanRecord<Data>, createSpan: CreateSpan, context: SpanOperationContext) => void

// Span comparisons (sort)
(spanA: SpanRecord<Data>, spanB: SpanRecord<Data>, context: SpanOperationContext) => number
```

### Documentation Sync

When adding, updating, removing, or renaming a span function, the following sections of this document must be kept in sync:

**For new/updated functions:**

1. **Quick Reference Table** (either "Span Sources" or "Span Transformers")
   - Add/update row with: function name (linked to section), type, description, modifies data flag, origin behavior, implementation pattern
   - Ensure correct category: Source, Combiner, Composer, or Transformer
   - Specify transform type: 1-to-1, 1-to-N, N-to-1, N-to-N, N-to-M
   - Implementation: Streaming, Temp array, Temp array*, Wrapper

2. **Function Section** (either "Span Sources" or "Span Transformers")
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

Follow these steps when creating or updating span functions.

### 1. Create Implementation File

1. Choose location based on function type:
   - **Source** → `src/span-sources/<function-name>.ts`
   - **Transformer** → `src/span-compose/<function-name>.ts`
2. Convert camelCase to kebab-case for filename
3. Implement with proper signature pattern (see Implementation Requirements)
4. Add JSDoc following template (see Implementation Requirements)

### 2. Update Exports

1. Add to barrel export: `src/span-sources/index.ts` or `src/span-compose/index.ts`
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

1. [**Quick Reference Table**](span-functions-reference.md#quick-reference)
   - Add row with: name (linked), type, description, modifies data, origin behavior, implementation
   - Category: Source, Combiner, Composer, or Transformer
   - Transform type: 1-to-1, N-to-1, N-to-N, N-to-M, 1-to-N
   - Implementation: Streaming, Temp array, Temp array*, Wrapper

2. **Function Section** ([Span Sources](span-functions-reference.md#span-sources) or [Span Transformers](span-functions-reference.md#span-transformers))
   - TypeScript signature with all overloads
   - Parameters (all valid values, defaults, behaviors)
   - Origin behavior explanation
   - Use cases (3-4 bullet points)
   - Examples in fenced code blocks

3. [**Design Principles**](span-functions-guidelines.md#design-principles) (if applicable)
   - Add new principle if introducing fundamental pattern
   - Update existing if behavior changes

4. [**Core Concepts**](span-functions-guidelines.md#core-concepts) (if applicable)
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

# Span Functions Guidelines

This document defines the contracts and workflow for implementing, testing, and documenting span sources and transformers.

See [Span Functions Reference](span-functions-reference.md) for public signatures, output semantics, edge behavior, and examples.

## Table of Contents

- [Core Contracts](#core-contracts)
- [Design Principles](#design-principles)
- [Implementation Requirements](#implementation-requirements)
- [Implementation Procedure](#implementation-procedure)

## Core Contracts

### Span Geometry and Data

A span describes a half-open document interval `[start, end)`:

- `start` and `end` are integer offsets measured in UTF-16 code units, matching JavaScript string indexing.
- `start === end` represents a point span used for insertions and markers.
- `data` is optional application metadata. Include `undefined` in the declared data type when downstream code must model missing data explicitly.
- `origin` optionally identifies the root span or root spans from which a derivative was produced.

`SpanOrigin` is `SpanRecord<unknown> | SpanRecord<unknown>[]`. Its data is `unknown` because a transformer may change the current span's data type while preserving a root created with another type. Raw span inputs may already contain an origin; sources preserve it unless their contract says otherwise.

### Sources, Generators, and Transformers

```typescript
type SpansSource<Data, RenderOptions> =
    | SpansIterable<Data>
    | GenerateSpans<Data, RenderOptions>;

type TransformSpans<InputData, RenderOptions, OutputData = InputData> = (
    input: SpansSource<InputData, RenderOptions>
) => GenerateSpans<OutputData, RenderOptions>;
```

- **Sources** use `spans*` names and produce or combine spans.
- **Generators** emit spans through `createSpan`; they do not return arrays.
- **Transformers** use `apply*` names, are curried, and may change both geometry and data type.
- **Composers** such as `spansCompose()` connect transformer output to the next transformer input from left to right.

### Contexts

`GenerateSpansContext` is available inside generators and contains generation state: `renderOptions`, `marker`, previously generated spans by marker or layer name, and shared `lines`.

`SpanOperationContext` is passed to operation callbacks and contains `document`, `lines`, `renderOptions`, the collected input `spans`, and `index`. For single-span callbacks, `index` is the current span's zero-based position. A comparison callback receives the shared context; `index` does not identify either comparator argument.

Reuse `context.lines` instead of constructing another `LineBoundaries` instance. This keeps all operations in a generation pass on the same document metrics.

---

## Design Principles

### 1. Composition and Naming

Span functions should compose without adapters:

- Use `spans*` for sources, combiners, and composers.
- Use `apply*` for curried transformers.
- Bind transformer configuration before the input source: `applyExpandTo('line', 2)(input)`.
- Make data-changing output explicit with `TransformSpans<InputData, RenderOptions, OutputData>`.
- Prefer parameters that expose meaningful behavior over implicit mode changes.

### 2. Immutability

Never mutate input span records or their origin chains. Emit output through `createSpan` and apply the transformer's documented origin policy:

```typescript
// Create a positional derivative and preserve its root
createSpan(newStart, newEnd, span.data, span.origin || span)

// Wrong: mutate input
span.start = newStart;
span.end = newEnd;
```

Filtering, sorting, and taking spans preserve the existing origin without creating a new one because they do not derive new geometry.

### 3. Streaming and Complete-input Evaluation

Use `processSpans()` for one-pass operations that do not need the complete input:

```typescript
return (document, createSpan, context) => {
    processSpans(document, input, (start, end, data, origin) => {
        createSpan(newStart, newEnd, data, origin || { start, end, data });
    }, context);
};
```

Use `processSpansWithContext()` when callbacks need stable `context.spans` and `context.index`. It collects the complete input before invoking the callback. This applies to `applyFilter`, `applyDataMap`, `applyMap`, `applyAugment`, `applySort`, and `applyTake`.

Complete-input evaluation may also be required by semantics, such as sorting, merging, inversion, padding, or branching over a one-shot iterable. Do not describe a function as streaming merely because it emits output through `createSpan`.

### 4. Origin and Data Propagation

Choose one origin policy and document it in JSDoc and the reference:

| Policy | Implementation | Typical functions |
| --- | --- | --- |
| Preserve | Pass the existing `origin` unchanged | filter, sort, take, append |
| Derive | `origin || { start, end, data }` | collapse, expand, fit, map, augment, pad |
| Clear | Emit `origin: undefined` to establish a new root | data map, reset origin |
| Merge | Emit an array of merged input spans | merge |
| None | Emit no origin because output is not a derivative | invert |

For positional derivatives, preserve the root rather than creating `origin.origin` chains:

```typescript
createSpan(newStart, newEnd, data, origin || { start, end, data });
```

`applyDataMap()` is intentionally different: changing data establishes a new semantic root, so it clears origin. Carry old data into the new data structure explicitly when it remains relevant.

### 5. Callback Signatures

Functions accepting callbacks follow consistent parameter patterns for predictable APIs:

**Single-span operations:**
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
- `context` - `{document, lines, renderOptions, spans, index}`
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

Keep the subject first, the emission callback second when present, and shared context last. Destructure context at the call site when only one or two fields are needed.

### 6. Compute Metrics On Demand

Avoid storing line boundary metrics (line numbers, columns) in `span.data` unless absolutely required. Compute on-demand from `context.lines`:
- **Span sources/transformers**: `GenerateSpans` callback receives `context` with `lines`
- **Span operation callbacks**: Predicates receive `context` with `lines`
- **Render hooks**: Pre-computed `line`/`column` properties available

**Why:** Line calculations are fast. Storing bloats data and creates redundancy.

Avoid storing values that can be derived from `context.lines` during the same generation pass:
```typescript
applyDataMap((span, { lines }) => ({
    ...span.data,
    line: lines.getLine(span.start)
}))
```

Store derived metrics only when they leave the render pipeline, are expensive to recompute across passes, or are part of the intended external data contract.

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
 * Explain non-obvious geometry, data, origin, ordering, or evaluation behavior.
 *
 * @param paramName - Description of parameter, including:
 *   - Valid values/types
 *   - Default values (if any)
 *   - Special behaviors
 * @returns Description of return value
 *
 * @example
 * // Concise example showing the function's distinguishing behavior
 * spansCompose(..., functionName(args))
 */
```

JSDoc must document every parameter, the return value, and the behaviors a caller cannot infer from the signature. As applicable, state:

- whether offsets are clamped, rejected, or allowed outside document bounds;
- whether input order is retained or normalized;
- whether all input is collected before callbacks or output;
- how `data` and `origin` are produced;
- how empty input, point spans, overlaps, and one-shot iterables behave.

Examples appear in editor tooltips, so keep them semantic and self-contained. Use `...` when the input source is irrelevant:

```typescript
spansCompose(
    ...,
    applyFilter((span, { lines }) =>
        lines.getLine(span.start) < 10
    )
)
```

Keep a concrete source when its data is essential to the example:

```typescript
spansCompose(
    spansFromMatch(/\w+/g),
    applyFilter((span) => span.data[0] === 'hello')
)
```

Add another example only when an overload, parameter form, or option changes the function's semantics. Different regexes, field names, or input sources do not need separate examples.

Do not shorten an example merely to reduce line count. In the public reference, prefer a complete, named recipe over an isolated call when the surrounding source or composition explains how the function is used. Preserve comments that explain:

- why a source or transformer appears at that point in the pipeline;
- what a non-obvious argument changes;
- which output, ordering, data, or origin behavior the example relies on;
- how two examples differ when they demonstrate distinct modes.

Comments should describe semantic intent, not restate syntax. For example, `// Coalesce overlapping context windows` is useful before `applyMerge()`, while `// Call applyMerge` is not. Use representative data types when a callback reads `span.data`, so the example can be followed without assuming `unknown` has particular fields.

### Test Structure

**File location:** Mirror source structure
- `src/span-compose/apply-expand-to.ts` → `test/span-compose/apply-expand-to.test.ts`

**Imports:** Public API only (`src/index.ts` or `src/types.d.ts`)

**Typical runtime test:**
```typescript
import { deepStrictEqual } from 'assert';
import { functionName, generateSpans } from '../../src/index.js';
import { startEnd } from '../utils.js';

describe('functionName', () => {
    it('transforms the relevant geometry', () => {
        const document = 'Hello World';
        const spans = generateSpans(document, fn());

        deepStrictEqual(startEnd(spans), [
            [0, 5],
            [10, 15]
        ]);
    });
});
```

Choose coverage from the function's contract rather than copying a fixed list:

| Contract surface | Tests to add when applicable |
| --- | --- |
| Geometry | empty input, point spans, document boundaries, overlaps, adjacent spans |
| Ordering/cardinality | input order, sorted order, duplicates, zero/one/many outputs |
| Callbacks | callback arguments, `context.index`, stable `context.spans`, render options |
| Data/origin | exact output data, root preservation, clearing, merged origin arrays |
| Source evaluation | generator invocation count, reusable and one-shot iterables |
| Parameters | every enum mode, defaults, tuple/scalar forms, invalid values |
| Types | inferred callback data and output data through `spansCompose()` |

Assert the complete output span set when practical. This exposes accidental extra output and ordering changes. Use a rendered-text assertion only when it communicates the behavior more clearly than offsets.

For a transformer that accepts arbitrary `SpansSource`, include a one-shot iterable regression whenever the implementation evaluates or branches over input more than once. For data-changing functions and composer overloads, add compile-time assertions in the existing type-test style.

**Helper utilities** (`test/utils.ts`):
- public `generateSpans()` - Generate normalized spans for exact assertions
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
    return (input: SpansSource<InputData, RenderOptions>) => {
        return (document, createSpan, context) => {
            // Transform input spans, calling createSpan for each output
        };
    };
}
```

Use the third `TransformSpans` generic when output data differs from input data. Origin data remains `unknown` because a derivative may preserve a root created before a data-changing transformation.

Use the callback signatures from [Design Principles](#5-callback-signatures). Do not add positional callback parameters for values already available in `SpanOperationContext`.

### Documentation Sync

Keep the public [Span Functions Reference](span-functions-reference.md) synchronized with source and tests:

1. Update the quick-reference row: category/cardinality, concise behavior, data behavior, origin policy, and evaluation strategy.
2. Update the function section: current signatures and overloads, parameters and defaults, output ordering and geometry, data/origin behavior, edge semantics, and a distinguishing example.
3. Repair incoming links and examples when a function is renamed or removed.
4. Update this document only when the change introduces or revises a shared implementation contract.
5. Update `AGENTS.md` immediately when a code change contradicts its architecture, terminology, public API, or validation requirements.

Avoid repeating generic use-case lists in every function section. Prefer details that affect a caller's decision or prevent a bug: point-span behavior, overlap rules, ordering, complete-input evaluation, one-shot inputs, regex state, option defaults, and type-inference limits.

---

## Implementation Procedure

Follow these steps when creating or changing a span function. Do not postpone tests and documentation until the implementation is otherwise complete; each stage checks a different part of the public contract.

### 1. Define the Contract

Write down the behavior that the implementation and tests must agree on:

1. Choose the category and name:
    - source, combiner, or composer: `spans*`;
    - curried transformer: `apply*`.
2. Define input and output data types. Use the third `TransformSpans` generic when they differ.
3. Define cardinality and ordering: can one input emit zero, one, or many outputs; can output be reordered or deduplicated?
4. Define geometry: which boundaries move, whether point spans are valid, and how document and line boundaries are handled.
5. Choose the origin policy from [Origin and Data Propagation](#4-origin-and-data-propagation): preserve, derive, clear, merge, or none.
6. Choose the evaluation strategy:
    - use `processSpans()` when each input can be handled independently;
    - use `processSpansWithContext()` when an operation callback needs stable `context.spans` or `context.index`;
    - materialize explicitly when sorting, merging, inversion, branching, or another whole-input operation requires it.
7. If the function accepts a callback, use one of the signatures in [Callback Signatures](#5-callback-signatures).

These decisions should be visible in the function's type, JSDoc, tests, and reference entry. If one of them cannot be stated precisely, resolve that ambiguity before adding implementation branches.

### 2. Create the Implementation

1. Create or update the file that owns the behavior:
    - source: `src/span-sources/<function-name>.ts`;
    - transformer: `src/span-compose/<function-name>.ts`.
2. Add the public generic signature before implementation details. Verify that output data inference matches runtime data, especially when output data is replaced or becomes `undefined`.
3. Implement generation through `createSpan()` without mutating input records.
4. Apply the origin policy chosen in step 1 consistently to every output path.
5. Add JSDoc using the template above. Document defaults, ordering, complete-input evaluation, data/origin behavior, and edge cases that are not obvious from the signature.
6. Add a semantic `@example`; add another only for a genuinely different mode or parameter form.

Run the source tests immediately after the first working implementation:

```bash
npm test
```

### 3. Update Public Exports

1. Export the function from its category barrel:
    - `src/span-sources/index.ts`; or
    - `src/span-compose/index.ts`.
2. Export it from `src/index.ts` so tests and consumers exercise the public API.
3. Export any new public types from the same public type surface used by related functions.

Do not import an implementation file directly from tests to work around a missing export.

### 4. Add Focused Tests

1. Mirror the source path:
    - `src/span-sources/spans-example.ts` → `test/span-sources/spans-example.test.ts`;
    - `src/span-compose/apply-example.ts` → `test/span-compose/apply-example.test.ts`.
2. Import runtime functions from `src/index.ts` and public types from `src/types.d.ts`.
3. Add a basic contract test that asserts the complete output span set.
4. Select relevant cases from the [test matrix](#test-structure), including geometry, ordering, callback context, data, origin, and parameter modes.
5. If input may be evaluated more than once, add a one-shot iterable test that verifies the intended consumption behavior.
6. If data changes or the function participates in composition, add a compile-time assignment that verifies inferred input and output data types.
7. Keep tests specific to this function; do not retest normalization or rendering behavior owned by another module.

Run the focused test while iterating, then the complete source suite and type checker:

```bash
npx mocha --import=tsx --conditions=test test/<category>/<function-name>.test.ts
npm test
npm run typecheck
```

### 5. Synchronize Documentation

1. Update the function's row in the [Quick Reference](span-functions-reference.md#quick-reference):
    - category or cardinality;
    - concise behavior;
    - data behavior;
    - origin policy;
    - evaluation strategy.
2. Update its full reference section with:
    - all public signatures and meaningful overloads;
    - every parameter, valid form, and default;
    - output geometry, ordering, and cardinality;
    - data and origin behavior;
    - complete-input evaluation and one-shot iterable implications;
    - empty-input, point-span, overlap, or boundary semantics where relevant;
    - commented examples that show realistic usage and explain the semantic role of each non-obvious step.
3. Update shared contracts in this guide only when the function introduces or changes a reusable implementation rule.
4. Update `AGENTS.md` immediately if the change contradicts its API, terminology, architecture, responsibilities, test structure, or validation requirements.
5. For a rename or removal, update incoming links and examples throughout both documents.

### 6. Validate the Change

Run fast validation after implementation, tests, exports, and docs agree:

```bash
npm run fast-check    # lint + source tests + typecheck
```

Fix failures at this stage before building generated outputs. Before committing, run the full validation:

```bash
npm run check         # Full validation:
                      # - Lint with autofix
                      # - Source unit tests (test/)
                      # - TypeScript type check
                      # - Transpile/bundle/emit types
                      # - Run tests for ESM/CJS builds
                      # - Test bundles
```

Finally, review the diff for accidental generated-file churn, stale terminology, broken Markdown links, and examples that no longer match the public callback signatures.

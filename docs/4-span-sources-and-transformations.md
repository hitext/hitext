# Span Sources and Transformations

A HiText view begins with spans that describe a source document and grows by deriving new spans from them.

Some spans already exist as application data. Others come from matching, document structure, render options, or previous pipeline layers. Transformations then filter, reshape, combine, or reinterpret those spans.

The central distinction is:

```text
span source
    → produces spans for a document

span transformation
    → derives another span source
```

A source answers:

> Where do these spans come from?

A transformation answers:

> What new spans follow from them?

Keeping those roles separate makes span computations reusable, compositional, and independent from rendering.

Choose a source by where its spans come from:

| Input relationship | Typical API |
| --- | --- |
| Already available records | Literal iterable or `spansFrom()` |
| Current document text | `spansFromMatch()` |
| Current document structure | `spansFromLines()` or a custom generator |
| Per-render application input | `spansFromOptions()` |
| Completed earlier layer | `spansFromLayer()` |
| Several independent inputs | `spansConcat()` or `spansWithFallback()` |

These categories describe dependencies, not output behavior. Every form produces spans in the same source coordinate space.

## A source is a computation, not necessarily a collection

The simplest span source is an array:

```js
const diagnostics = [
    {
        start: 42,
        end: 53,
        data: {
            severity: 'error'
        }
    }
];
```

But HiText does not require spans to be collected in advance.

A source may also:

* scan the current document;
* read values from render options;
* reuse the result of an earlier layer;
* compute spans from line boundaries;
* call an external analyzer;
* derive spans lazily through a custom generator.

Conceptually, all these forms mean the same thing:

```text
document + evaluation context
    → zero or more spans
```

This common source model allows transformations to work without knowing whether their input began as an array, a matcher, an application option, or another layer.

## Use existing spans directly

Use a literal span collection when the geometry is already known and remains valid for the document being rendered:

```js
const selection = [{
    start: 18,
    end: 31,
    data: {
        kind: 'selection'
    }
}];

const view = html().addLayer(
    selection,
    content => `<mark>${content}</mark>`
);
```

This is appropriate when spans come from:

* a parser or analyzer invoked before rendering;
* application state tied to one document;
* a test fixture;
* a static example;
* a small fixed annotation set.

The important contract is that all offsets address the document passed to the pipeline.

HiText does not translate offsets from another document version or output representation.

## Adapt dynamic input with `spansFrom()`

`spansFrom()` adapts supported input forms into a span source.

It is useful when the input is already conceptually spans but needs to participate in composition:

```js
const visible = spansFrom([
    [10, 20],
    [30, 45]
]);
```

It may also represent special document-relative sources such as document boundaries:

```js
spansFrom('document-start')
spansFrom('document-end')
```

These point sources are useful for generated content:

```js
string()
    .addLayer(
        spansFrom('document-start'),
        { replace: () => 'Result: ' }
    )
    .render('42');
// Result: 42
```

`spansFrom()` should be read as an adapter:

> Treat this value or document-relative concept as a span source.

It is not an analysis algorithm by itself.

## Derive spans from matches

Use `spansFromMatch()` when a string or regular expression is sufficient to identify spans in the document:

```js
const todoSpans = spansFromMatch(/\bTODO\b/g);
```

The source performs matching for each document evaluation and emits one span per match.

```js
const view = html().addLayer(
    spansFromMatch(/\bTODO\b/g),
    content => `<mark>${content}</mark>`
);
```

A match source is useful for:

* search terms;
* simple token classes;
* textual markers;
* redaction patterns;
* log identifiers;
* lightweight examples and prototypes.

It should not replace a parser or structured matcher when the task depends on syntax, nesting, captures, or grammar state. Those systems can produce spans through the same source interface.

The key architectural point is that matching produces spans, not markup. The result remains available for derivation, reuse, and alternative materialization.

## Derive spans from document lines

Use `spansFromLines()` when lines or their boundaries are the primary source geometry.

Depending on its mode, it can identify:

* complete lines;
* line content without the newline;
* line starts;
* line ends;
* other supported line-relative spans or points.

For example, line-start points can insert numbers:

```js
const numbered = string().addLayer(
    spansFromLines('line-start'),
    {
        replace: ({ line }) => `${line} │ `
    }
);
```

Line sources are useful when the task starts from document structure rather than another annotation:

* line numbering;
* alternating line presentation;
* complete-line filtering;
* per-line metadata;
* line boundary insertions;
* log and report processing.

When a line is needed because of another span, use a transformation instead:

```text
diagnostic
    → containing line
```

That relationship is better expressed by expanding the diagnostic than by scanning all lines and trying to match them back to it.

## Read spans from render options

Use `spansFromOptions()` when span data changes between render calls but the pipeline structure remains the same.

```js
const diagnosticSpans = spansFromOptions('diagnostics');

const view = html().addLayer(
    diagnosticSpans,
    content => `<mark>${content}</mark>`
);
```

The same pipeline can then render different analyzer results:

```js
view.render(sourceA, {
    diagnostics: diagnosticsA
});

view.render(sourceB, {
    diagnostics: diagnosticsB
});
```

This is useful for application-owned data such as:

* diagnostics;
* selections;
* search results;
* changed regions;
* user annotations;
* externally computed syntax spans;
* active filters or focus regions.

Render options supply values for one evaluation. They do not change the configured layer graph.

Use them when the view structure is stable but its inputs vary.

## Reuse an earlier layer

Use `spansFromLayer()` when new spans should be derived from spans already generated inside the pipeline:

```js
spansFromLayer('diagnostics')
```

For example:

```js
const contextSpans = spansCompose(
    spansFromLayer('diagnostics'),
    applyExpandTo('line', 1),
    applyMerge()
);
```

This expresses an explicit dependency:

```text
diagnostics
    → context
```

It is preferable to rerunning the analyzer or repeating the matching logic because:

* the earlier result is evaluated once;
* the dependency is visible in the pipeline;
* transformed spans can preserve provenance;
* multiple later layers can reuse the same source;
* tests can inspect each stage independently.

A named layer therefore acts as both:

* a possible part of the visible result;
* a named intermediate product in the span dataflow.

Use `spansFromLayer()` whenever the new geometry is conceptually derived from a result the pipeline already has.

## Write a custom source when analysis owns the task

A custom generator is appropriate when no built-in source captures the analysis naturally.

```js
function spansFromNumbers(document, createSpan) {
    for (const match of document.matchAll(/\d+/g)) {
        createSpan(
            match.index,
            match.index + match[0].length,
            {
                value: Number(match[0])
            }
        );
    }
}
```

Use it like any other source:

```js
const view = html().addLayer(
    spansFromNumbers,
    (content, { data }) =>
        `<var data-value="${data.value}">${content}</var>`
);
```

A custom source can use:

* the current document;
* line boundaries;
* render options;
* completed earlier layers;
* external indexes or analyzers;
* application-specific parsing logic.

Span generation is synchronous. If an external analyzer or index is asynchronous, complete that work before calling `.render()` and pass its results through render options or another synchronous source.

Its responsibility should remain analysis:

> Given this document and context, emit spans that describe it.

Avoid putting renderer-specific output into a span generator. The same spans may later be used by HTML, TTY, DOM, JSX, or analytical layers with no rendering at all.

## Compose transformations from left to right

`spansCompose()` starts with one source and applies transformations in order:

```js
const omittedSpans = spansCompose(
    spansFromLayer('matches'),
    applyExpandTo('line', 2),
    applyMerge(),
    applyInvert()
);
```

Read it as a dataflow:

```text
matches
    → expand each match to surrounding lines
    → merge overlapping context
    → derive everything outside it
```

Each transformation receives a span source and returns another span source.

The composition itself does not render anything. It describes how spans will be computed when the pipeline evaluates a document.

This left-to-right structure is valuable because the code follows the same order as the reasoning.

## Transformations express different kinds of change

Span transformations do not all operate in the same way.

Some process each span independently. Some need the complete input set. Some preserve geometry and change only data. Others create spans that no longer correspond one-to-one with the input.

Understanding these categories is more useful than memorizing individual functions.

| Transformation concern | Typical operations | Input evaluation |
| --- | --- | --- |
| Membership | filter, take | Complete input when callback context or sequence position is required |
| Data | data map | Complete input for stable callback context |
| Local geometry | expand, collapse, fit | One input span at a time |
| Custom derivatives | map, augment | Complete input for stable callback context |
| Whole-set geometry | sort, merge, invert | Complete input |
| Combined flows | append, fork, fallback | Depends on source and branch semantics |

The [Span Functions Reference](span-functions-reference.md#quick-reference) gives the exact cardinality, data, origin, and evaluation contract for every operation.

## Select spans

Filtering preserves only spans that satisfy a condition:

```js
const errors = spansCompose(
    spansFromOptions('diagnostics'),
    applyFilter(({ data }) => data.severity === 'error')
);
```

Use filtering when the existing spans already have the required geometry, but only some of them participate in the next stage.

Examples:

* only errors, not warnings;
* only selected token kinds;
* only matches on particular lines;
* only spans whose data passes an application policy;
* only annotations inside a chosen section.

Filtering changes membership, not geometry.

It is often better to keep the original layer complete and derive a filtered layer than to remove information at the initial source.

```text
all diagnostics
    ├── visible diagnostics
    └── critical diagnostics
            └── expanded context
```

## Transform span data

Sometimes the geometry is correct, but later layers or hooks need different metadata.

`applyDataMap()` replaces span data:

```js
const labels = spansCompose(
    spansFromLayer('diagnostics'),
    applyDataMap(({ data }) => ({
        label: data.severity.toUpperCase(),
        message: data.message
    }))
);
```

`applyAugment()` preserves each input span and lets a callback emit additional derivative spans:

```js
const classified = spansCompose(
    spansFromLayer('diagnostics'),
    applyAugment((span, createSpan) => {
        if (span.data.severity === 'error') {
            createSpan(span.end, span.end, {
                kind: 'critical-marker'
            });
        }
    })
);
```

Use `applyDataMap()` when the goal is to replace or enrich the data of each existing span. Use `applyAugment()` when the original spans and newly generated derivatives should continue through the same source.

Use data transformations to prepare semantic information once rather than recomputing it in several hooks.

Examples include:

* assigning display classes;
* calculating priority;
* attaching labels;
* normalizing external analyzer records;
* extracting only fields needed downstream;
* adding derived classification.

Data transformation should not be used merely to smuggle renderer output through the span pipeline. Keep semantic data independent from its final representation where possible.

## Transform geometry locally

Local geometry transformations derive each output span primarily from one input span.

Examples include:

* expanding a span;
* collapsing it to a boundary;
* padding it to line limits;
* fitting it into a window;
* mapping it into one or more related spans.

### Expand into a larger region

```js
const context = spansCompose(
    spansFromLayer('matches'),
    applyExpandTo('line', 2)
);
```

This commonly produces:

* containing lines;
* surrounding lines;
* wider character windows;
* enclosing document regions supported by the operation.

Expansion answers:

> What larger region is relevant because this span exists?

### Collapse to a boundary

```js
const markers = spansCompose(
    spansFromLayer('diagnostics'),
    applyCollapseTo('end')
);
```

The output is a point span suitable for insertion.

Collapse answers:

> At which boundary of this span should another representation be anchored?

### Pad to line structure

Line padding adjusts spans around line boundaries without requiring the source producer to know line-ending details.

It is useful for:

* full-line omission;
* complete diagnostic lines;
* line-oriented output;
* preserving or excluding newline characters deliberately.

### Fit into a bounded window

Window fitting restricts or reshapes spans according to a desired output window.

This is useful when context has a fixed maximum size or when the view needs to preserve an important inner region while limiting surrounding content.

Local geometry operations often preserve a relationship to their input through `origin`.

## Map one span into zero, one, or many spans

`applyMap()` is the general local transformation primitive.

It can express operations for which no dedicated helper exists:

```js
const boundaries = spansCompose(
    spansFromLayer('sections'),
    applyMap((span, createSpan) => {
        createSpan(span.start, span.start, {
            side: 'start'
        });

        createSpan(span.end, span.end, {
            side: 'end'
        });
    })
);
```

One input span may produce:

* no output spans;
* one modified span;
* several derived spans.

Use `applyMap()` when the transformation is naturally described per input span and requires custom geometry or data.

Examples:

* emit both boundaries;
* divide one span into several parts;
* convert a token into a label point;
* create inner and outer regions;
* selectively change geometry;
* derive multiple semantic projections.

A named public transformation is usually worthwhile when the operation:

* recurs in many tasks;
* has non-obvious edge cases;
* needs consistent provenance behavior;
* benefits from optimization;
* forms part of the shared span vocabulary.

Otherwise, `applyMap()` keeps one-off domain logic local.

## Transform the whole span set

Some operations depend on relationships between several input spans.

They must collect or otherwise consider the full set.

## Sort spans

```js
const ordered = spansCompose(
    source,
    applySort(compare)
);
```

Sorting is useful when a later operation depends on sequence rather than only geometry.

Examples:

* take the first spans in document order;
* aggregate headings;
* group diagnostics predictably;
* assign ordinal data;
* build a generated list.

Do not sort merely because rendering needs ordered spans. The renderer owns its own ordering rules.

Sort explicitly when order is part of the span computation or its observable result.

## Merge overlapping or adjacent spans

```js
const visible = spansCompose(
    spansFromLayer('matches'),
    applyExpandTo('line', 2),
    applyMerge()
);
```

Merge replaces several related geometries with their combined coverage.

```text
[------)
    [------)
          [---)

↓

[-------------)
```

It is especially useful after expansion, since nearby input spans often produce overlapping context windows.

Merge changes more than cardinality. Several input spans may contribute to one output span, so provenance and data aggregation require defined behavior.

Use it when downstream stages care about continuous covered regions rather than each original annotation separately.

Do not merge source annotations merely because they overlap. A syntax token, diagnostic, and search match occupying the same region are still distinct spans with distinct meanings.

## Invert coverage

```js
const omitted = spansCompose(
    spansFromLayer('visible'),
    applyInvert()
);
```

Invert derives gaps in the source coverage.

```text
document: [----------------------------)
input:          [----------)
output:   [-----)          [-----------)
```

It is usually used after spans have been expanded and merged into the regions that should remain visible.

Typical pattern:

```text
important spans
    → context
    → merged visible regions
    → inverted omitted regions
```

Invert is a set-level operation. Its output represents absence of input coverage rather than a one-to-one transformation of a particular source span.

For that reason, inverted spans have `data: undefined` and no origin. See [`applyInvert()`](span-functions-reference.md#applyinvertexact) for empty-input and trailing-boundary behavior.

## Select part of a sequence

`applyTake()` keeps a bounded part of the collected span sequence.

It can support:

* first or last matches;
* top-ranked results after sorting;
* limited previews;
* bounded generated summaries;
* test and debugging views.

Selection by count depends on order, so establish the intended ordering explicitly when necessary.

## Preserve originals beside one derivative pipeline

`applyFork()` passes through the original spans, runs one sequential sub-pipeline over the same input, and appends only that sub-pipeline's final output.

```js
const diagnosticsAndMarkers = spansCompose(
    spansFromLayer('diagnostics'),
    applyFork(
        applyCollapseTo('end'),
        applyDataMap(() => ({ kind: 'diagnostic-marker' }))
    )
);
```

Conceptually:

```text
diagnostics ───────────────────────────────┐
    └── collapse to end → map marker data ─┴── combined source
```

The transformations passed to `applyFork()` are not independent branches: each receives the output of the previous one. Use separate named layers when derivations have different meanings or consumers, and use `spansConcat()` when several independent sources must feed one later transformation.

## Concatenate independent sources

`spansConcat()` combines results from several span sources:

```js
const relevant = spansConcat(
    spansFromLayer('diagnostics'),
    spansFromLayer('changes'),
    spansFromOptions('selection')
);
```

Concatenation preserves the contributing spans as separate values. It does not geometrically merge their coverage.

This is useful when several kinds of facts should feed one later transformation:

```text
diagnostics ─┐
changes ─────┼──→ relevant spans → context → merge
selection ───┘
```

For example:

```js
const visible = spansCompose(
    spansConcat(
        spansFromLayer('diagnostics'),
        spansFromLayer('changes')
    ),
    applyExpandTo('line', 1),
    applyMerge()
);
```

The distinction between concatenate and merge is fundamental:

```text
concatenate
    → combine collections

merge
    → combine geometry
```

## Provide fallbacks

`spansWithFallback(...inputs)` creates a source that tries independent inputs in order and emits the first non-empty result. `applyFallback(...fallbacks)` is the transformer form: it first tries the current composition input, then the supplied fallback sources when that input is empty.

This can express policies such as:

* show diagnostic context when diagnostics exist;
* otherwise show changed lines;
* otherwise show a document preview.

```text
diagnostics
    or changes
    or default preview
```

Fallback is different from concatenation:

* concatenation uses all contributing results;
* fallback chooses the first usable result.

Use it when sources represent alternative strategies rather than independent facts.

## Append generated spans

`applyAppend()` passes through the existing span flow and then emits spans from the appended sources.

This is useful for including:

* document boundary points;
* default regions;
* synthetic anchors;
* application-provided additions;
* spans required regardless of source results.

As with concatenation, appending combines values rather than merging geometry.

## Cardinality is part of the operation

A useful way to reason about a transformation is to ask how many output spans may follow from its input.

### One to one

```text
one input span
    → one output span
```

Examples:

* data mapping;
* simple geometry adjustment.

### One to zero or one

```text
one input span
    → kept or removed
```

Example:

* filtering.

### One to many

```text
one input span
    → several derived spans
```

Examples:

* augmentation, which preserves an input and may add derivatives;
* extracting both boundaries;
* splitting;
* custom `applyMap()` operations.

### Many to one or fewer

```text
several input spans
    → combined output
```

Examples:

* merging;
* aggregation;
* grouping.

### Whole set to complementary set

```text
input coverage
    → uncovered regions
```

Example:

* inversion.

Cardinality affects:

* whether an operation can stream over individual spans;
* whether it needs the complete set;
* how data should be combined;
* how provenance should be represented;
* whether ordering matters.

This is why seemingly similar helpers may have different semantics and costs.

## Preserve meaning through data and origin

Geometry alone is often insufficient after transformation.

Suppose a diagnostic span is expanded to a complete line:

```text
diagnostic:       [----)
line:        [---------------)
```

The new span has different geometry, but downstream code may still need to know:

* which diagnostic caused it;
* its severity;
* its message;
* whether several diagnostics contributed.

HiText separates two related mechanisms.

### `data`

Data describes the current span in application terms.

A transformed span may:

* preserve existing data;
* replace it;
* augment it;
* calculate a new semantic record.

### `origin`

Origin records which source span or spans produced a derivative.

It supports:

* tracing a context window back to a diagnostic;
* retaining individual matches after merging;
* generating summaries from collected annotations;
* explaining why a span exists;
* constructing higher-level structures.

Not every operation has a meaningful origin. A complement span, for example, describes a gap in coverage rather than a derivative of one particular input span.

Origin points directly to root span records rather than forming a chain of every intermediate derivative. Each transformation therefore has a documented policy:

* preserve the current root origin;
* derive from an input's root;
* clear origin;
* merge several roots into an array;
* emit no origin.

Choosing a transformation also chooses this policy; callers do not redefine it per invocation. Together with the other operation properties:

```text
geometry
data
origin
order
cardinality
```

These properties define the real semantics of a span function more accurately than its implementation alone.

## Choose transformations by their origin policy

Do not infer origin behavior from geometry alone. Two operations that produce similar ranges may preserve different roots, clear origin, or aggregate several roots. Check the function contract when downstream code depends on provenance.

Use `applyResetOrigin()` at an intentional semantic boundary when later derivatives should treat the current spans as new roots. Use `applyDataMap()` when provenance should be cleared while data changes. Operations such as `applyMerge()` and `applyInvert()` have their own fixed aggregation or no-origin behavior.

## Choose composition or a custom generator

A task can often be expressed either with built-in transformations or with one custom generator.

For example, contextual excerpts could be written as one custom algorithm. But the composition:

```js
spansCompose(
    spansFromLayer('matches'),
    applyExpandTo('line', 2),
    applyMerge(),
    applyInvert()
)
```

has several advantages:

* each relationship is visible;
* operations are independently tested;
* intermediate stages can become named layers;
* policies can be changed locally;
* the same transformations recur in other tasks.

Use composition when the task decomposes naturally into shared span relationships.

Use a custom generator when:

* the analysis is domain-specific;
* several stages require one shared traversal;
* the built-in decomposition would duplicate expensive work;
* the required output depends on complex global state;
* the domain operation is clearer as one named concept.

The goal is not to maximize the number of functions in a composition. It is to express the task at the clearest useful level.

## Name meaningful intermediate results

A long inline composition is appropriate when the result has one local purpose:

```js
.addLayer(
    spansCompose(
        spansFromLayer('diagnostics'),
        applyCollapseTo('end')
    ),
    markerHooks
)
```

Create a named analytical layer when the result:

* has domain meaning;
* feeds several later layers;
* should be independently inspected or tested;
* represents a useful boundary in the view design.

```js
const pipeline = html()
    .addLayer(diagnosticSpans, diagnosticHooks, 'diagnostics')
    .addLayer(
        spansCompose(
            spansFromLayer('diagnostics'),
            applyExpandTo('line', 1),
            applyMerge()
        ),
        null,
        'visible-context'
    );
```

Names should describe the role of the result, not the operations that produced it.

Prefer:

```text
visible-context
affected-lines
critical-diagnostics
section-boundaries
```

over:

```text
expanded-and-merged
filtered-spans
step-3
```

The pipeline then communicates the domain model rather than its implementation recipe.

## A complete example

Consider a source report that should retain context around either diagnostics or changed lines.

The source facts are independent:

```js
const diagnosticSpans = spansFromOptions('diagnostics');
const changedSpans = spansFromOptions('changes');
```

Add each fact source once, then derive later computations from the named layer results:

```js
const report = html()
    .addLayer(
        diagnosticSpans,
        content => `<span class="diagnostic">${content}</span>`,
        'diagnostics'
    )
    .addLayer(
        changedSpans,
        content => `<span class="change">${content}</span>`,
        'changes'
    )
    .addLayer(
        spansCompose(
            spansConcat(
                spansFromLayer('diagnostics'),
                spansFromLayer('changes')
            ),
            applyExpandTo('line', 1),
            applyMerge()
        ),
        null,
        'visible'
    )
    .addLayer(
        spansCompose(
            spansFromLayer('visible'),
            applyInvert()
        ),
        spanHooksHide()
    );
```

The external sources are evaluated once. Presentation and later analysis both consume the completed named layers.

The computation can be read without knowing how rendering is implemented:

```text
diagnostics ─┐
             ├── relevant regions
changes ─────┘
        → surrounding lines
        → merged visible regions
        → omitted complement
```

The rendering layers then assign interpretation only where needed:

```text
diagnostics → diagnostic presentation
changes     → change presentation
visible     → analytical only
omitted     → omission presentation
```

## A source-selection checklist

When choosing how spans enter a pipeline, ask:

- Are the spans already available?<br>
  → Use a literal collection or `spansFrom()`.
- Should they be recomputed from the current document?<br>
  → Use `spansFromMatch()`, `spansFromLines()`, or a custom generator.
- Do they vary between render calls?<br>
  → Use `spansFromOptions()`.
- Do they follow from an earlier pipeline result?<br>
  → Use `spansFromLayer()`.
- Do several independent sources feed one computation?<br>
  → Use `spansConcat()`.
- Are the sources alternatives?<br>
  → Use a fallback.

## A transformation checklist

Before adding a transformation, ask:

1. Does it select spans, change their data, or change their geometry?
2. Is it local to each span or dependent on the complete set?
3. What is its input-to-output cardinality?
4. Does order affect the result?
5. What should happen to data?
6. Is origin meaningful for the output?
7. Is this a reusable span relationship or domain-specific analysis?
8. Should the result remain inline or become a named analytical layer?

These questions usually reveal both the appropriate API and the correct place in the pipeline.

## From spans to layers

Span sources and transformations define the analytical side of a view:

```text
document
    → root spans
    → derived spans
```

They deliberately do not decide:

* how intersections become valid output structure;
* when hooks run;
* how replacement consumes source text;
* how strings, DOM nodes, or JSX children are accumulated;
* how the same spans receive renderer-specific interpretation.

Those concerns begin where spans are attached to layers and materialized by a renderer.

The next guide explains that boundary.

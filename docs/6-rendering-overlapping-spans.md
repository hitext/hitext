# Rendering Overlapping Spans

A HiText pipeline may contain spans produced by independent systems.

A parser identifies syntax. A search engine finds matches. An analyzer reports diagnostics. A view derives omissions and insertion points. None of these producers needs to coordinate its geometry with the others.

As a result, their spans do not necessarily form one nested structure.

```text
syntax:       [-------------)
search:             [-----------)
diagnostic:      [------------------)
```

This is not a problem while spans remain analytical data. Each span simply describes a range of the source document.

It becomes a problem when the spans are materialized as HTML, DOM, JSX, terminal state, or another structured output. Most output models require a deterministic order and, often, proper nesting.

This chapter explains how HiText interprets arbitrary span intersections while preserving each complete generated span and its source coordinates.

It assumes the basic layer and hook model from [Layers and Materialization](5-layers-and-materialization.md). The focus here is what changes when spans cross, replace source regions, or interrupt surrounding output.

## Spans do not have to form a tree

Some span relationships are naturally nested:

```text
A: [----------------)
B:     [--------)
```

They can be represented directly:

```text
open A
    text
    open B
        text
    close B
    text
close A
```

Other spans cross:

```text
A: [-----------)
B:       [-----------)
```

A direct traversal would produce:

```text
open A
open B
close A
close B
```

That ordering is not properly nested.

It cannot directly become valid HTML or a DOM tree, because the first opened element would close while its child remained open.

The span model must therefore be distinguished from the output structure:

> Spans describe source relationships. Materialization constructs a valid target representation.

HiText does not require analyzers to reshape crossing spans in advance. It resolves their intersections during rendering.

## Layer order decides which crossing span is segmented

Suppose `A = [1, 8)` belongs to an earlier layer and `B = [5, 12)` belongs to a later layer. A must remain outer to B throughout their overlap. Because B continues after A ends, B is materialized as two segments:

```text
A: [-----------)
B:       [-----------)

segments:
A: [--------)
B:      [--)[---)
```

More explicitly:

```text
source:  [-------------------)

A:       [-----------)
B:             [-----------)

segments:

A:       [-----------)
B₁:            [-----)
B₂:                  [-----)
```

The original analytical objects remain two spans: `A` and `B`.

The render traversal uses three materialized segments: `A`, `B₁`, and `B₂`.

This enables a valid nested event sequence:

```text
open A
    text
    open B₁
        text
    close B₁
close A

open B₂
    text
close B₂
```

Reversing the layer order reverses the overlap nesting and changes which span must be segmented. The exact emitted structure depends on the hooks and renderer, but the first registered layer is predictably outer on every overlap segment.

## Fragmentation is directional

Layer precedence gives fragmentation a direction:

```text
earlier layer
    stable outer structure, fragmented less

later layer
    adapts to earlier boundaries, fragmented more
```

This is why layer order is useful rather than only deterministic. It lets a view decide which spans define its structural blocks.

For section and line spans:

| Registration order | Structural result | Span most likely to split |
|---|---|---|
| sections, then lines | lines are children of sections | lines at section boundaries |
| lines, then sections | section segments are children of lines | sections at line boundaries |

The same principle applies to syntax, search matches, diagnostics, selections, diff regions, and omissions. Put the layer whose wrappers should remain most continuous first. Put layers that may safely become several target nodes later.

This rule does not change interaction among spans produced by one layer. Same-layer spans still use their geometry and source order. The additional precedence exists only when different layer markers interact.

Fragmentation has observable consequences:

* `open`, `close`, and `wrap` may run once for every segment;
* one generated span may produce several DOM, JSX, or structured nodes;
* stateful hooks must tolerate temporary close and reopen operations;
* `context.span` remains the complete span while `context.start` and `context.end` identify each segment.

Do not choose order only to reduce the number of hook calls. Choose the required target ancestry first, then make hooks segment-safe. See [Choose layer order by output ownership](5-layers-and-materialization.md#choose-layer-order-by-output-ownership) for practical patterns.

## Span and segment describe different scopes

A span is the complete analytical entity:

```js
{
    start: 10,
    end: 30,
    data: diagnostic
}
```

A segment is the part of that span currently being materialized:

```text
span:       [--------------------)
segment 1:  [--------)
segment 2:           [-----------)
```

Hook context exposes both views.

Conceptually:

```text
context.span.start / context.span.end
    the complete generated span

context.start / context.end
    the current materialized segment for open, wrap, and close

    the current document chunk for text
```

For `replace`, `start` and `end` describe the replacement segment selected by the render traversal. The public property names are `span`, `start`, and `end`.

Use the complete span when logic depends on:

* the original diagnostic or match;
* the total source range;
* span data and provenance;
* the complete generated record across intersections.

Use the current segment when logic depends on:

* the text being emitted now;
* whether this is the first or last visible part;
* the boundaries of the current wrapper;
* segment-specific output.

A single span may cause its hooks to run more than once.

## Do not count hook calls as spans

Consider a hook that increments a diagnostic counter:

```js
{
    open(context) {
        diagnosticsCount++;
        return '<span class="diagnostic">';
    }
}
```

This looks reasonable for non-crossing input, but a crossing span may be closed and reopened as several segments. The counter may then be incremented more than once for one diagnostic.

The general rule is:

> Rendering hooks operate on materialized segments, not necessarily once per analytical span.

Operations that must happen once per span are usually better performed before rendering:

```text
diagnostic spans
    → aggregate or classify once
    → materialize the result
```

When render-time state genuinely needs to follow one generated span across several segments, key it by `context.spanIndex`. The index is stable across that span's segments within one render, but it is not a persistent application identity across render calls.

This is particularly important for:

* unique identifiers;
* counters;
* event collection;
* resource ownership;
* stateful terminal formatting;
* metrics and instrumentation.

## Rendering proceeds through source boundaries

A useful mental model is to treat rendering as a walk through ordered source boundaries.

For example:

```text
A: [----------)
B:      [----------)
P:                |
```

The document contains boundaries for:

* the start of `A`;
* the start of `B`;
* the end of `A`;
* point span `P`;
* the end of `B`.

Between adjacent boundaries, the active set of spans is stable:

```text
region 1: A
region 2: A + B
region 3: B
```

HiText uses these changes to determine:

* which interpretations become active;
* which must be temporarily completed;
* which continue as another segment;
* how source text should be emitted;
* where generated values are inserted.

This boundary model is more useful for understanding output than the internal sorting or stack implementation.

## Materialization preserves source order

Unless a projection replaces or suppresses source content, ordinary source text is consumed in document order.

Spans may:

* wrap source content;
* transform source chunks;
* replace covered regions;
* contribute values at boundaries.

They do not make the underlying traversal jump between arbitrary output coordinates.

Derived representations that appear to move content are constructed explicitly:

1. derive data from source spans;
2. insert a generated representation at another boundary;
3. hide or replace the original region when needed.

The source coordinate space remains unchanged throughout the process.

## Hook lifecycles repeat per segment

`wrap` operates on a completed child-buffer result, while `open` and `close` contribute at traversal boundaries. [Layers and Materialization](5-layers-and-materialization.md#boundary-hooks-can-express-streaming-style-output) explains when each form is appropriate.

Segmentation adds one rule: the selected lifecycle runs for every materialized segment, not once for the complete generated span. A split wrapper may therefore produce several target nodes, and boundary hooks may open and close the same generated span more than once.

Use `context.span` and the per-render `context.spanIndex` to relate those invocations. Do not treat the first `open` as the permanent start or the first `close` as the permanent completion of the analytical fact.

## Source text has a renderer default

Text between span boundaries is handled by the renderer.

Examples:

* `string()` appends the source chunk as a string;
* `html()` escapes source text before appending it;
* `dom()` creates text nodes;
* `jsx()` contributes text children;
* a custom renderer may emit structured text records.

This default is important because span hooks should not need to reimplement ordinary text handling.

For example, an HTML wrapper can return markup while the source document remains safely escaped by the HTML renderer:

```js
html().addLayer(
    spansFromMatch('<value>'),
    content => `<mark>${content}</mark>`
);
```

The source text `<value>` is escaped by the renderer before being passed as materialized child content. The hook result itself is renderer output and follows the renderer’s hook contract.

The distinction between source text and hook-generated values should be explicit for each renderer, especially when handling untrusted data.

## A span may override text interpretation

Advanced hooks may change how source chunks are emitted while their span is active.

Conceptually:

```js
{
    text(sourceChunk, context) {
        return visualizeWhitespace(sourceChunk);
    }
}
```

Possible uses include:

* displaying spaces and tabs;
* normalizing selected text;
* building token records instead of plain strings;
* applying span-specific escaping;
* suppressing only particular source chunks.

Text interpretation is selected deterministically. HiText walks from the innermost active span outward and uses the first active `text` hook it finds; when none exists, it uses the renderer-level `text` hook. The hook context belongs to the span that owns the selected hook, while `start` and `end` describe the current document chunk.

Because an inner hook can override an outer hook for the same chunk, custom text hooks should be used deliberately. Most annotation layers should rely on the renderer’s default source-text behavior.

## Replacement consumes a source region

A replacement hook substitutes a span’s covered source text:

```js
string().addLayer(
    spansFromMatch(/token=\w+/g),
    {
        replace() {
            return 'token=[redacted]';
        }
    }
);
```

```text
source:
request token=secret

result:
request token=[redacted]
```

Conceptually:

```text
arrive at replacement start
    → emit replacement value
    → advance past the covered source range
```

The replaced text is not emitted normally.

This makes replacement suitable for:

* redaction;
* omission;
* abbreviations;
* folding;
* normalized representations;
* generated summaries standing in for source content.

Other spans may intersect the replaced region. Their observable behaviour depends on how they relate to the replacement and whether they continue outside it.

The important design rule is:

> Replacement defines ownership of a source region in the materialized view.

It should therefore be used intentionally when several visible layers overlap the same text.

## Fully contained spans may disappear under replacement

Suppose span `R` replaces a region that fully contains annotation `A`:

```text
R: [----------------)
A:     [------)
```

If the replacement consumes the entire source region, there is no ordinary child source content in which `A` can be materialized.

Conceptually:

```text
R replacement
    replaces everything covered by R
    including source regions annotated by A
```

This is usually the desired result for:

* omissions;
* redaction;
* collapsed sections;
* generated summaries.

When nested annotations must remain observable, wrapping is often more appropriate than replacement, or the replacement itself must explicitly use the source span data to reconstruct the desired representation.

## Crossing spans may continue after replacement

A span can begin inside a replaced region and continue beyond it:

```text
replacement: [----------)
annotation:       [------------)
```

The source portion inside the replacement is consumed, but the annotation still covers source text after the replacement boundary.

Conceptually, its visible materialization may begin with a later segment:

```text
replacement output
annotation continuation: [------)
```

When an annotation begins before a replacement and continues after it, layer order decides their relationship. An annotation from an earlier layer remains outside the replacement. An annotation from a later layer closes before the replacement and resumes afterwards. Set `break: true` when the replacement must interrupt every surrounding interpretation regardless of layer.

These cases are one reason replacement semantics belong to the render model rather than to simple string substitution. HiText must reconcile replacement boundaries with active overlapping spans and produce a valid continuation.

## Choose between replacement and interruption

`replace` and `break` answer different questions:

```text
replace
    Does this span consume its source region?

break
    Must this span sit outside every surrounding interpretation?
```

They can be used independently or together:

| Configuration | Source text | Surrounding layers |
|---|---|---|
| wrapping hooks only | preserved | normal layer precedence |
| `replace` | consumed | earlier layers may wrap it; later layers are interrupted |
| `break` without `replace` | preserved | all surrounding interpretations are interrupted |
| `replace` with `break` | consumed | all surrounding interpretations are interrupted |

Use ordinary `replace` when the replacement still belongs to the surrounding structural context, such as an abbreviation inside a section. Add `break` when the replacement is itself a structural boundary, such as an omission between two independently materialized fragments.

Avoid adding `break` merely to move a replacement one level outward. If the desired relationship follows the general view structure, adjust layer order instead. Use `break` for an exception that must override every layer.

Advanced hooks should not assume that every source position covered by their complete span necessarily appears in the output.

## Point spans insert without consuming text

A point span has equal start and end offsets:

```js
{
    start: 20,
    end: 20
}
```

It describes a source boundary rather than source content.

A replacement on a point span inserts output:

```js
{
    replace() {
        return '⚠';
    }
}
```

```text
source:
value

point:
     |

result:
value⚠
```

Point spans are useful for:

* line numbers;
* labels;
* warning markers;
* generated suggestions;
* document headers and footers;
* table-of-contents insertion;
* footnote references.

By default, a point is placed at the depth of its layer. Spans from earlier layers wrap the insertion, while spans from later layers are outside it. The same rule applies when the boundary is the start or end of another span, not only when the point is strictly inside one.

Use `point` when the insertion must ignore layer depth:

```js
{
    replace: () => '⚠',
    point: 'inside'
}
```

The available policies are:

* omitted - the default; inside earlier layers and outside later layers;
* `'inside'` - inside all non-replacement spans touching the boundary;
* `'outside'` - outside all non-replacement spans touching the boundary.

"Touching" includes three positions:

```text
span:       [-------------)
start:      |
inside:           |
end:                      |
```

A point at the span start, strictly inside the span, or at the span end touches that span. A point before the start or after the end does not.

The policies affect every touching non-replacement span as follows:

| Point policy | Earlier layers | Same layer | Later layers |
|---|---|---|---|
| omitted | point is inside | ordinary same-layer rules | point is outside |
| `'inside'` | point is inside | point is inside | point is inside |
| `'outside'` | point is outside | point is outside | point is outside |

Use the default when the insertion conceptually belongs to its layer. Use `'inside'` for content that must become part of the innermost touching annotation regardless of layer order. Use `'outside'` for a boundary value such as a gutter marker or structural label that must not inherit touching wrappers.

Prefer the default when layer order already expresses the intended relationship. Explicit point policy is an override, not a replacement for choosing coherent layer order.

Several points from different layers at one boundary are handled as one boundary event. Outside points materialize first, layer-relative points follow registration order, and inside points materialize last.

Within one layer, omitted `point` preserves the ordinary pre-layer-precedence traversal rules, including source order for fully tied points. `break: true` is an explicit structural override and places a point outside surrounding spans even when `point` is `'inside'`.

## Equal spans remain independent

Two spans may have identical geometry:

```text
A: [----------)
B: [----------)
```

They are still separate entities.

Their interpretation order may affect the nested result:

```text
A(B(content))
```

versus:

```text
B(A(content))
```

Examples include:

* search highlighting over syntax;
* selection over a diagnostic;
* a link and emphasis covering the same source;
* two independent structured annotations.

Equal spans nest in layer registration order: the earlier layer is outer and the later layer is inner. Fully tied spans produced by one layer retain source iteration order.

## Interruption changes structural behaviour

Some spans are not ordinary nested annotations.

An omission or replacement may need to interrupt surrounding interpretation rather than appear as an ordinary child inside it.

For example:

```text
outer annotation: [--------------------------)
omission:                 [-------)
```

Materializing the omission as a child of the outer annotation may produce a wrapper that incorrectly spans across hidden source content.

A structural interruption instead allows the surrounding annotation to end before the omission and continue as another segment afterwards:

```text
outer segment 1
omission
outer segment 2
```

HiText exposes this behaviour through the hook definition’s interruption policy, currently represented by `break`.

Built-in helpers such as omission hooks should encode the appropriate policy. Application code usually should not set interruption flags casually, because they affect traversal structure rather than only the value emitted by one span.

Use an interruption when the span represents a structural boundary in the output:

* omitted source;
* a fold;
* a replacement that should not inherit surrounding wrappers;
* a target-specific boundary that cannot be nested normally.

See [Replacement and Interruption](pipeline-and-rendering-reference.md#replacement-and-interruption) for the exact public contract.

## Segmentation preserves target validity, not visual continuity

When a span is split around an interruption or crossing, its target wrapper may also be split.

For example:

```text
diagnostic span: [-------------------)
omission:             [------)
```

may materialize as:

```text
diagnostic segment
omission
diagnostic segment
```

rather than one wrapper spanning the omission.

This preserves valid target structure and explicit projection boundaries, but it means the output may contain several target nodes for one analytical span.

Custom CSS, DOM logic, JSX keys, and structured renderers should account for that possibility.

If the application requires one persistent object per analytical fact, it may be better to produce a structured analytical result before rendering. Nodes produced during one render can be grouped by their shared `spanIndex`, but that index should not be persisted across renders.

## Buffers separate traversal from output construction

The render traversal should not be tied to string concatenation.

HiText therefore materializes output through renderer-provided buffers.

Conceptually, a buffer supports:

```ts
interface RenderBuffer<Child, Result> {
    append(child: string | Child | Result): void;
    emit(): Result;
}
```

A renderer creates a root buffer.

Nested materialization may create child buffers. When a child is complete, its emitted result can be:

* wrapped;
* appended to a parent;
* transformed into a target node;
* collected as a structured value.

This allows one traversal model to support different output forms:

```text
same span traversal
    ├── string concatenation
    ├── HTML string construction
    ├── terminal output
    ├── DOM fragments
    ├── JSX children
    └── application objects
```

The buffer abstraction is not merely a performance utility. It is what makes output type independent from span analysis.

Tree renderers use nested buffers to turn completed child results into nodes. The next guide, [Creating a Custom Renderer](create-custom-renderer.md), develops that target contract and its normalization choices step by step.

## Stateful renderers must restore outer state

Terminal output illustrates why renderer state belongs to materialization.

Suppose an outer span sets one terminal style and an inner span temporarily applies another:

```text
outer style: [----------------)
inner style:      [------)
```

After the inner span ends, the renderer must restore the outer style rather than simply emit a universal reset.

Crossing spans and interruptions make this more demanding because one analytical span may be temporarily closed and reopened.

A correct stateful renderer must derive state transitions from the active materialization stack, not assume that every close permanently ends a source span.

This concern belongs to the renderer implementation. Span producers should express semantic styles or data, not terminal escape sequences tied to one traversal assumption.

## What HiText guarantees at the rendering boundary

The useful public guarantees should be phrased in terms of observable behaviour rather than the internal algorithm.

A stable render model should guarantee that:

* all spans refer to the original document coordinate space;
* independent spans may overlap, nest, coincide, or cross;
* materialized output follows deterministic ordering rules;
* span segment lifecycles and nested buffer traversal are properly nested;
* one span may be materialized as several segments;
* segment hooks retain access to the complete generated span, its per-render `spanIndex`, and data;
* replacement consumes its selected source region;
* point replacement inserts without consuming source text;
* source text is interpreted by the renderer;
* materialization returns one renderer-defined result.

These guarantees are more important to users than whether the implementation uses a stack, event list, iterator, or another internal representation.

## What application hooks should not assume

Unless explicitly guaranteed by a more specific API contract, a hook should not assume that:

* it runs exactly once per span;
* one span produces exactly one output node;
* another active span is always its analytical parent;
* source text covered by its span always remains visible;
* input iteration order alone determines output nesting;
* an opening event is the first materialization of the span;
* a closing event is the final materialization of the span;
* renderer output offsets correspond to source offsets.

Avoiding these assumptions makes hooks robust to crossings, projections, and renderer-specific materialization.

## Choosing the right stage for logic

When implementing a view, ask where a piece of logic belongs.

### Span generation

Use it to discover facts:

```text
find diagnostics
match text
read analyzer results
identify lines
```

### Span transformation

Use it to derive relationships and geometry:

```text
expand context
filter
group
merge
invert
extract boundaries
classify data
```

### Layer interpretation

Use it to assign output meaning:

```text
highlight
wrap
replace
insert
hide
attach target-specific values
```

### Renderer

Use it to define the target representation:

```text
escape source text
create buffers
construct nodes
manage terminal state
emit the final result
```

Many difficult rendering hooks become simpler when analysis and geometry are moved to earlier stages.

## Debugging rendering behaviour

When output is unexpected, inspect the stages separately.

### 1. Inspect generated spans

Verify:

* start and end offsets;
* span data;
* layer marker and expected named-layer grouping;
* derived origins;
* point positions.

### 2. Inspect analytical relationships

Check whether:

* context was expanded correctly;
* spans were merged when intended;
* omissions represent the correct complement;
* layer dependencies use the expected source.

### 3. Inspect intersections

Draw or log the relevant spans over the source:

```text
A: [----------)
B:      [----------)
R:            [----)
```

Identify:

* nesting;
* crossing;
* equal boundaries;
* points;
* replacements and interruptions.

For different layers, also write their registration order beside the drawing. Ask which span should own the target subtree and whether the observed fragmented span is the later layer. Reversing two layers is a useful diagnostic experiment, but keep the reversal only when the resulting ancestry is the desired public structure.

### 4. Inspect segment context

For advanced hooks, record:

* complete span range;
* current segment range;
* complete span and per-render `spanIndex`;
* hook type;
* emitted value.

This reveals whether unexpected repeated calls are caused by segmentation rather than duplicate source spans.

Common layer-order symptoms are:

| Symptom | Likely cause | Check |
|---|---|---|
| A wrapper appears as several sibling nodes | it belongs to a later crossing layer | inspect registration order and `context.spanIndex` |
| A point inherits an unexpected wrapper | its default layer depth differs from the intended role | move the point layer or use explicit `point` policy |
| A replacement closes too many wrappers | `break` overrides normal precedence | remove `break` unless a global interruption is required |
| A replacement remains inside an unwanted wrapper | that wrapper is an earlier layer | reconsider layer order or use `break` for a deliberate exception |
| Hook counts exceed span counts | one span has several materialized segments | aggregate before rendering or group calls by `spanIndex` |
| Reordering appears to do nothing | one layer has no render hooks or spans do not overlap | inspect resolved hooks and span geometry |

### 5. Inspect the renderer separately

Test:

* ordinary source text;
* one wrapped span;
* nested spans;
* crossing spans;
* point insertion;
* replacement;
* interruption;
* empty output.

This separates span-model errors from target-materialization errors.

## The rendering model in one view

HiText rendering can be summarized as:

```text
source document
    + generated spans
    + layer interpretations
    ↓
ordered source boundaries
    ↓
active span changes
    ↓
renderable segments
    ↓
hook interpretation
    ↓
renderer buffers
    ↓
target result
```

The model preserves two important separations:

```text
span
    complete generated record over the source document

segment
    one materialized part of that span
```

and:

```text
interpretation
    what a span contributes to a view

renderer
    how those contributions become a target value
```

These separations allow independent and crossing annotations to remain simple analytical data while still producing valid HTML, terminal output, DOM, JSX, or custom structures.

Most users do not need to manage segmentation directly.

They need only remember that materialization may divide one span into several target fragments, and that advanced hooks must operate correctly under that model.

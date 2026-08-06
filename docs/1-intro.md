# HiText

Text becomes difficult not when one system annotates it, but when several independent systems need to describe and reshape it at the same time.

A syntax highlighter identifies tokens. A search engine finds matches. A linter reports diagnostics. An application selects relevant context, hides unrelated regions, inserts explanations, or builds a more compact representation.

Each system can describe its own result easily. Combining those results is the hard part.

If every step immediately modifies text or emits markup, later steps no longer see the original document. Offsets change. Existing annotations must be translated. Generated markup becomes input to unrelated tools. Overlapping annotations may not form a valid tree at all.

HiText keeps one immutable source document and represents everything else as spans over that document.

```text
source document
    + independent spans
    + derived spans
    + output interpretation
    → representation
```

The result may be a string, HTML, terminal output, DOM, JSX, or an application-defined object structure. The spans do not need to know which representation will eventually be produced.

## Spans over one source document

A span is an attributed entity over a range of source offsets:

```js
{
    start: 6,
    end: 11,
    data: {
        kind: 'search-match'
    }
}
```

The range `[start, end)` describes where the span is located. The span itself may also carry application data and an `origin` that points to the root span or spans from which it was derived.

This distinction matters. Two spans may occupy the same range while representing different facts:

```text
search match:    [---------)
diagnostic:      [---------)
```

The geometry is equal. The spans are not.

Every span continues to address the original document, regardless of what other spans do during rendering.

Suppose several tools analyze the same source:

```text
syntax:       [-------------)
search:             [-----------)
diagnostic:      [------------------)
```

Their spans may be separate, nested, equal, or crossing. The producers do not need to coordinate with one another, emit compatible markup, or translate their offsets after another tool runs.

A HiText layer associates a span source with optional rendering hooks and an optional name:

```js
const view = html()
    .addLayer(syntaxSpans, syntaxHooks)
    .addLayer(searchSpans, searchHooks)
    .addLayer(diagnosticSpans, diagnosticHooks);
```

HiText combines the layers only when the view is materialized.

The first central principle is therefore:

> Analysis describes the source document. Materialization combines those descriptions.

## Spans are compositional data

A span does not have to mean “apply a style to this text”.

Spans may also describe:

* regions that should remain visible;
* regions that should be omitted or replaced;
* boundaries where generated content should be inserted;
* context around search matches or diagnostics;
* groups derived from earlier analysis;
* fragments used to build another representation of the document.

A later layer can derive its spans from an earlier one:

```text
diagnostic spans
    → surrounding lines
    → merged context
    → omitted complement
```

Each step produces another span source over the same document.

For example, a diagnostic view can retain only the lines around reported problems:

```js
spansCompose(
    spansFromLayer('diagnostics'),
    applyExpandTo('line', 1),
    applyMerge(),
    applyInvert()
)
```

This composition starts with diagnostic spans, expands them into context windows, joins overlapping windows, and finally produces spans for everything outside the visible regions.

No output text has been cut yet. No HTML has been generated. All operations still describe the original document.

## Views instead of mutations

Highlighting is the simplest use of a span: preserve the document and change how one region is represented.

HiText can also build projections in which some source regions are omitted, replaced, summarized, or accompanied by generated content.

```text
interesting spans
    → visible context
    → omitted regions
    → ellipses
```

This differs from transforming the source string step by step.

Cutting the source first would invalidate existing offsets. Cutting rendered output afterwards could break HTML elements, DOM structure, JSX trees, or terminal style state.

HiText instead resolves selection, omission, insertion, and annotation together over one source coordinate space.

The spans that remain visible preserve their source coordinates and application data. Their interpretation belongs to the layer that materializes them.

## Layers form a dataflow

A pipeline is not limited to a flat list of decorations. Named layers make completed span sets available to later layers.

```text
diagnostics
    ├── diagnostic presentation
    ├── surrounding context
    │       └── omitted regions
    └── end boundaries
            └── generated markers
```

One analysis can therefore support several derived parts of the same view.

A layer may also be analytical: it can produce spans for later layers without rendering anything itself.

This creates a simple dataflow:

```text
root spans
    → derived spans
        → further derived spans
            → materialized view
```

The pipeline remains ordered and explicit, while its dependencies may branch and rejoin.

## Materialize late

Span generation and transformation do not determine the final output type. This analytical span model can be reused when configuring pipelines for different targets:

```js
html()
tty()
dom()
jsx()
```

String renderers concatenate text. DOM and JSX renderers construct object trees. A custom renderer may produce JSON-compatible nodes, an event stream, an annotation structure, or another application-specific result.

The renderer is selected when a pipeline is created, before layers are added, because layer hooks may return target-specific values. Materialization itself still happens late: span sources and transformations are evaluated, overlaps are resolved, and output values are produced only when `.render()` is called.

The second central principle is:

> Spans define what a view means. A renderer defines the shape in which that view is materialized.

HiText therefore sits between document analysis and presentation.

It does not need to own parsing, matching, diagnostics, ranking, or editing. Those systems can produce spans. HiText composes their results, derives new spans from them, and builds the representation required by the application.

## The complete model

The main flow is:

```text
Document
    ↓
Span sources
    ↓
Span transformations
    ↓
Layers: spans + optional hooks + optional name
    ↓
Renderer
    ↓
String / HTML / TTY / DOM / JSX / custom output
```

Most applications begin with one renderer and one layer.

More advanced views add independent annotations, derive spans from earlier layers, select context, represent omissions, insert generated content, or expose intermediate results for testing and tooling.

The next guide builds such a view step by step.

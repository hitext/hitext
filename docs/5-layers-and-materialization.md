# Layers and Materialization

Span sources and transformations describe a document without deciding what the final result must look like.

They can identify diagnostics, derive context windows, calculate omitted regions, extract boundaries, or group related annotations. All these products remain spans over the same source document.

A renderer can materialize the source document without any span layers. Layers add analytical or presentational span roles to that base representation.

In HiText, that binding is a layer:

```text
span source + optional span hooks + optional name
```

A layer answers two separate questions:

> Which spans participate here?

> Should they have rendering hooks, a name for later derivation, or both?

Keeping those questions separate allows the same span computations to support different outputs, while keeping presentation independent from the analysis that produced the spans.

## From a span source to a visible layer

Suppose a search source identifies every occurrence of `TODO`:

```js
const todoSpans = spansFromMatch(/\bTODO\b/g);
```

By itself, this source produces information but no output.

Attach it to an HTML pipeline:

```js
const view = html().addLayer(
    todoSpans,
    content => `<mark>${content}</mark>`
);
```

The function is a shorthand interpretation:

> Render the content covered by each span, then wrap it in `<mark>`.

```js
view.render('TODO: add validation');
// <mark>TODO</mark>: add validation
```

The source still knows nothing about HTML. It only identifies spans.

The layer associates those spans with one HTML interpretation.

This is the basic materialization boundary:

```text
analysis
    todoSpans

interpretation
    wrap as <mark>

materialized result
    HTML string
```

## One document can have many interpretations

A real view usually combines spans produced for unrelated reasons:

```js
const view = html()
    .addLayer(
        keywordSpans,
        content => `<span class="keyword">${content}</span>`
    )
    .addLayer(
        searchSpans,
        content => `<mark>${content}</mark>`
    )
    .addLayer(
        diagnosticSpans,
        content => `<span class="diagnostic">${content}</span>`
    );
```

The layers do not transform one another’s output.

They all describe one source document:

```text
keyword:        [---------)
search:              [--------)
diagnostic:       [--------------)
```

HiText combines their interpretations only during materialization.

This differs from applying formatting procedures sequentially:

```text
source
    → syntax HTML
    → search over syntax HTML
    → diagnostic markup over modified HTML
```

In that model, every step inherits the representation choices and coordinate changes of earlier steps.

With layers, the relationship is instead:

```text
keyword spans ─────┐
search spans ──────┼──→ materialization
diagnostic spans ──┘
```

Each layer remains independently replaceable and testable.

## A layer is not necessarily visible

Some spans exist only to support later derivations.

Consider a compact search view:

```text
matches
    → surrounding context
    → merged visible regions
    → omitted complement
```

The match spans affect output directly: they are highlighted.

The omitted spans also affect output directly: they become ellipses.

The visible context spans may not need an interpretation at all. Their role is to define the geometry from which omissions are derived.

```js
const view = html()
    .addLayer(
        matchSpans,
        content => `<mark>${content}</mark>`,
        'matches'
    )
    .addLayer(
        visibleSpans,
        null,
        'visible'
    )
    .addLayer(
        omittedSpans,
        spanHooksHide()
    );
```

The `visible` layer is analytical.

It participates in the pipeline’s dataflow but not directly in the rendered result.

This distinction keeps the view model clear:

```text
matches
    ├── visible interpretation
    └── derive context

visible context
    └── analytical product

omitted regions
    └── visible interpretation
```

A layer therefore does not mean “something rendered on screen”.

It means:

> A role for a span source within this pipeline, optionally exposed by name.

That role may be analytical, presentational, or both.

## Names expose relationships

A layer name makes its generated spans available to later layers:

```js
.addLayer(
    diagnosticSpans,
    diagnosticHooks,
    'diagnostics'
)
```

A later source can depend on that completed result:

```js
spansFromLayer('diagnostics')
```

This turns the pipeline into a dataflow:

```text
diagnostics
    ├── diagnostic presentation
    ├── surrounding context
    └── end boundaries
```

For example:

```js
const contextSpans = spansCompose(
    spansFromLayer('diagnostics'),
    applyExpandTo('line', 1),
    applyMerge()
);

const markerSpans = spansCompose(
    spansFromLayer('diagnostics'),
    applyCollapseTo('end')
);
```

Both products derive from the same diagnostic layer, but serve different purposes.

```text
diagnostics
    ├── contextSpans
    └── markerSpans
```

The name identifies a domain result, not an implementation step.

Prefer names such as:

```text
diagnostics
visible-context
changed-lines
section-headings
selected-regions
```

rather than:

```text
expanded
merged
step-2
temporary-spans
```

A good layer name communicates why the spans exist.

## Build the span model before materializing it

A useful view design usually follows this order:

```text
source facts
    → derived geometry
    → analytical layers
    → visible interpretations
    → materialization
```

For example:

```text
diagnostics
    → surrounding lines
    → merged visible regions
    → omitted complement
    → omission rendering
```

The transformations do not emit HTML, terminal codes, DOM nodes, or JSX elements.

They calculate the view’s geometry.

Only the final layer binding says how a particular span set should contribute to the output:

```js
.addLayer(
    omittedSpans,
    spanHooksHide({
        skippedLines: () => '…'
    })
)
```

This separation matters because geometry is often reusable while presentation changes.

The same omitted spans might become:

* a textual ellipsis in a report;
* an expandable node in a DOM view;
* a dimmed folded block in an interactive interface;
* a structured omission record in JSON;
* no visible output in an analytical export.

The span computation remains the same.

## Interpretation begins with wrapping

The simplest interpretation wraps the materialized content of each span:

```js
content => `<mark>${content}</mark>`
```

The explicit form is:

```js
{
    wrap(content) {
        return `<mark>${content}</mark>`;
    }
}
```

Wrapping works well when a span means:

> Materialize this region normally, then place the resulting content inside another representation.

Typical uses include:

* highlights;
* syntax categories;
* links;
* emphasis;
* diagnostic containers;
* structured annotation nodes.

For HTML, the result may be markup.

For DOM, it may be an element containing child nodes.

For JSX, it may be an element with rendered children.

For a custom renderer, it may be an application object:

```js
{
    type: 'diagnostic',
    severity: 'error',
    children
}
```

The concept is the same even though the output type is not.

## Use span data to choose interpretation

A span may carry data produced by an analyzer or transformation:

```js
{
    start,
    end,
    data: {
        severity: 'error',
        message: 'The value may be undefined'
    }
}
```

The interpretation receives that data. When hooks return HTML markup, application data interpolated into it must be validated or escaped explicitly:

```js
function escapeHtmlAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const diagnosticHooks = {
    wrap(content, { data }) {
        const severity = data.severity === 'error' ? 'error' : 'warning';

        return (
            `<span class="diagnostic ${severity}">` +
                content +
            '</span>'
        );
    }
};
```

The HTML renderer escapes chunks read from the source document. It does not parse or escape markup strings returned by hooks, because those strings are the renderer instructions themselves.

This keeps semantic analysis separate from output representation.

The analyzer decides that a diagnostic is an error.

The layer decides how an error appears in this renderer.

Another materialization may use the same data differently:

```text
HTML
    → CSS class

TTY
    → terminal style

DOM
    → element attributes and interaction

structured output
    → severity field
```

Span data should generally describe the source fact, not contain a prebuilt representation for one renderer.

## Use boundaries when output belongs beside a span

Not all generated output replaces or wraps source content.

A diagnostic may need a marker immediately after the affected expression:

```text
diagnostic:  [----------)
marker:                  |
```

Derive a point span at the diagnostic boundary:

```js
const markerSpans = spansCompose(
    spansFromLayer('diagnostics'),
    applyCollapseTo('end')
);
```

Then interpret that point:

```js
.addLayer(
    markerSpans,
    {
        replace: ({ data }) =>
            '<span class="marker" title="' +
                escapeHtmlAttribute(data.message) +
            '">⚠</span>'
    }
)
```

A point span has equal start and end offsets. It consumes no source text, so its replacement acts as an insertion.

This pattern is useful for:

* labels;
* line numbers;
* warning markers;
* suggestions;
* generated references;
* section summaries;
* content inserted at the start or end of the document.

The generated content remains anchored to a source boundary rather than being appended later through unrelated output manipulation.

## Replace source regions to build projections

A non-empty span can replace the source text that it covers:

```js
const secretSpans = spansFromMatch(/token=\w+/g);

const redacted = string().addLayer(
    secretSpans,
    {
        replace: () => 'token=[redacted]'
    }
);
```

```js
redacted.render('request token=secret');
// request token=[redacted]
```

Replacement changes the materialized view, not the source document.

Other spans continue to use source offsets.

This is particularly important for projections:

```text
visible regions
    → complement
    → omission spans
    → ellipsis replacement
```

```js
const omittedSpans = spansCompose(
    spansFromLayer('visible'),
    applyInvert()
);

const excerpt = html().addLayer(
    omittedSpans,
    spanHooksHide()
);
```

The result may contain only a fraction of the source text, but annotations inside retained regions still address the original document.

No output-coordinate translation is required.

## Wrapping and replacement express different relationships

Wrapping says:

> Preserve the materialized content of this span and add a surrounding interpretation.

Replacement says:

> Consume this source region and contribute another value instead.

```text
wrap
    source content remains part of the result

replace
    source content is substituted
```

Examples:

### Wrap

* search highlight;
* syntax style;
* hyperlink;
* diagnostic container;
* semantic output node.

### Replace

* redaction;
* omission;
* generated abbreviation;
* synthetic summary;
* boundary insertion through a point span.

Choosing between them is a statement about the view, not merely an API preference.

## Boundary hooks can express streaming-style output

Some interpretations are naturally expressed as separate opening and closing contributions:

```js
{
    open: () => '<span class="diagnostic">',
    close: () => '</span>'
}
```

This resembles wrapping, but the two forms express slightly different needs.

Use `wrap` when the interpretation needs the completed child result:

```js
wrap(content) {
    return createNode({ children: content });
}
```

Use `open` and `close` when the renderer can naturally contribute boundary values independently:

```js
open() {
    return '<span>';
},
close() {
    return '</span>';
}
```

The exact trade-offs depend on the renderer and output type. Application code can usually begin with `wrap` and use explicit boundary hooks only when their semantics are useful.

The important distinction is not the number of callbacks. It is whether the interpretation operates on completed child content or on the boundaries of its materialization.

## Source text can have renderer-level interpretation

Most layers do not need to change how ordinary source chunks are emitted.

The renderer already defines the default:

* HTML escapes source text;
* plain string output preserves it;
* DOM creates text nodes;
* JSX returns text children;
* a custom renderer may create structured text records.

Advanced layers may override text interpretation for their active spans.

This can support cases such as:

* visualizing invisible characters;
* replacing tabs inside selected regions;
* displaying whitespace markers;
* applying span-specific escaping or normalization;
* converting source chunks into structured records.

This is different from replacing a complete span.

A text interpretation processes source chunks that remain part of normal traversal, while replacement substitutes a selected region as a whole.

Most views should leave source-text handling to the renderer unless the task explicitly requires a local alternative.

## Materialization must resolve overlaps

Independent spans do not necessarily form one nested tree.

Consider two crossing spans:

```text
A: [----------)
B:      [----------)
```

HTML, DOM, JSX, and most structured outputs require properly nested results. They cannot represent this directly as:

```text
open A
open B
close A
close B
```

HiText resolves such intersections during materialization.

Conceptually, only the spans that must be interrupted are split into multiple materialized segments. For `A = [1, 8)` and `B = [5, 12)`:

```text
A: [----)[---)
B:      [-------)
```

Here A contributes `[1, 5)` and `[5, 8)`, while B remains one segment `[5, 12)`. The renderer can then produce a valid nested sequence.

The original spans are not rewritten into unrelated objects. Their materialization is divided into segments.

This introduces an important distinction:

```text
span
    the complete analytical entity over the source document

segment
    the part of that span materialized between intersection boundaries
```

A single span may therefore contribute more than once during rendering.

## Hooks operate on materialized segments

For ordinary non-crossing spans, one span usually corresponds to one materialized region.

For crossing spans, the same interpretation may be entered more than once:

```text
span A
    → segment A1
    → segment A2
```

Hook context distinguishes the complete span from the current segment:

```text
span.start / span.end
    complete source span

start / end
    current materialized segment
```

This distinction matters when writing advanced hooks.

A hook should not assume:

> It will be called exactly once for every generated span.

This is especially important for:

* stateful renderers;
* event collection;
* counters;
* generated element identifiers;
* resource acquisition and cleanup;
* aggregation performed during rendering.

Within one render, `spanIndex` identifies the same generated span across its repeated segments, while `span` exposes that complete generated record. Neither is a persistent application identity across render calls. When logic should happen once per generated span, deduplicate by `spanIndex` within that render or, preferably, perform the logic earlier during span transformation.

This is another reason not to use rendering hooks as a substitute for analysis.

## Keep analysis out of hooks

Hooks are tempting places to perform arbitrary work because they see span data and document context.

However, calculations that produce new relationships between spans usually belong before materialization.

Prefer:

```text
diagnostics
    → classify
    → derive context
    → group
    → attach interpretation
```

over:

```text
diagnostic hook
    → search surrounding document
    → find related spans
    → calculate context
    → emit output
```

The first form has several advantages:

* derived products remain inspectable;
* the computation can be reused by other layers;
* analysis does not repeat for split segments;
* the result remains output-independent;
* tests can verify geometry separately from rendering.

Hooks should primarily interpret a span in the selected output model.

Transformations should establish what the span means geometrically and semantically.

## Layer order is a final tie-breaker

Layers are evaluated in registration order, but rendering does not treat that order as a general overlap priority.

For example:

```js
const view = html()
    .addLayer(syntaxSpans, syntaxHooks)
    .addLayer(searchSpans, searchHooks)
    .addLayer(diagnosticSpans, diagnosticHooks);
```

Before materialization, generated spans are ordered by:

1. lower start offset;
2. higher interruption weight from `break` and `replace` hooks;
3. larger end offset;
4. layer registration order when the preceding properties are equal.

Layer order therefore decides only otherwise equal cases. `break` and `replace` semantics can interrupt surrounding materialization independently of registration order, and crossing spans are resolved through segment handling.

At the same time, layer order should not be used to encode analysis dependencies indirectly. When one span set derives from another, name the source layer and use `spansFromLayer()`.

```text
data dependency
    → named layer relationship

otherwise equal spans
    → layer order as tie-breaker
```

These are related but distinct concerns.

## Pipelines are immutable view definitions

Adding a layer returns another pipeline rather than mutating the original:

```js
const base = html()
    .addLayer(syntaxSpans, syntaxHooks);

const searchable = base
    .addLayer(searchSpans, searchHooks);

const diagnostic = base
    .addLayer(diagnosticSpans, diagnosticHooks);
```

This allows one configured prefix to support several views:

```text
base syntax view
    ├── search view
    └── diagnostic view
```

Immutability applies to the view definition, not to cached output.

Each render call evaluates the current document, its options, span sources, renderer state, and materialization independently.

This makes pipelines suitable as reusable descriptions:

```js
diagnosticExcerpt.render(sourceA, optionsA);
diagnosticExcerpt.render(sourceB, optionsB);
```

The pipeline expresses how to build the view. The document and application inputs remain per-call values.

## Choose the renderer at the outer boundary

A renderer defines the target representation in which layer interpretations operate.

Built-in renderer families include:

```js
string()
html()
tty()
dom()
jsx()
```

Their output models differ:

```text
string
    → unescaped string values

HTML
    → escaped source text plus markup values

TTY
    → text plus terminal style transitions

DOM
    → nodes and document fragments

JSX
    → JSX-compatible child values
```

A custom renderer may produce:

* JSON-compatible objects;
* annotation trees;
* event records;
* report nodes;
* another application-defined representation.

The renderer does not decide which regions are diagnostics or which context is visible.

Those decisions already exist as spans and layers.

It decides how source text, nested content, and hook results are accumulated into one output value.

## The same analysis can support several renderers

The exact interpretation values may differ by renderer, but the span model can remain shared.

```js
const diagnostics = spansFromOptions('diagnostics');

const visible = spansCompose(
    diagnostics,
    applyExpandTo('line', 1),
    applyMerge()
);

const omitted = spansCompose(
    visible,
    applyInvert()
);
```

An HTML view can attach markup:

```js
const htmlView = html()
    .addLayer(
        diagnostics,
        content => `<span class="error">${content}</span>`
    )
    .addLayer(
        omitted,
        spanHooksHide({
            skippedLines: () => '<span class="ellipsis">…</span>'
        })
    );
```

A terminal view can attach terminal-oriented interpretations to the same sources:

```js
const terminalView = tty()
    .addLayer(
        diagnostics,
        terminalErrorStyle
    )
    .addLayer(
        omitted,
        terminalOmissionHooks
    );
```

The shared part is not necessarily one pipeline object. It is the analytical span graph and the relationships it describes.

```text
diagnostics
    → visible context
    → omitted regions

        ├── HTML interpretation
        └── terminal interpretation
```

This is more reusable than embedding presentation into the analyzer that produced the diagnostics.

## Structured output is still materialization

HiText output does not need to resemble rendered text.

A custom renderer may transform the same layers into a structured tree:

```js
[
    {
        type: 'text',
        value: 'const value = '
    },
    {
        type: 'diagnostic',
        severity: 'error',
        children: [
            {
                type: 'text',
                value: 'config.value'
            }
        ]
    }
]
```

From HiText’s perspective, this follows the same model:

```text
source text
    + spans
    + interpretations
    → renderer-defined result
```

The renderer determines how nested materialized values are accumulated.

This makes structured output useful for:

* server-side processing;
* test snapshots;
* annotation export;
* custom viewers;
* AI-oriented context structures;
* intermediate representation between analysis and UI.

Materialization means producing an observable representation, not necessarily producing text.

## A complete layer graph

Consider the diagnostic view built in the previous guide.

Its analytical structure is:

```text
keywords

diagnostics
    ├── marker boundaries
    └── visible context
            └── omitted regions
```

Its interpretations are:

```text
keywords
    → keyword presentation

diagnostics
    → diagnostic presentation

marker boundaries
    → generated warning marker

visible context
    → no direct output

omitted regions
    → ellipsis presentation
```

The corresponding pipeline is:

```js
function escapeHtmlAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const diagnosticExcerpt = html()
    .addLayer(
        keywordSpans,
        content => `<span class="keyword">${content}</span>`
    )

    .addLayer(
        diagnosticSpans,
        {
            wrap(content, { data }) {
                const severity = data.severity === 'error'
                    ? 'error'
                    : 'warning';

                return (
                    `<span class="diagnostic ${severity}">` +
                        content +
                    '</span>'
                );
            }
        },
        'diagnostics'
    )

    .addLayer(
        spansCompose(
            spansFromLayer('diagnostics'),
            applyCollapseTo('end')
        ),
        {
            replace: ({ data }) =>
                '<span class="marker" title="' +
                    escapeHtmlAttribute(data.message) +
                '">⚠</span>'
        }
    )

    .addLayer(
        spansCompose(
            spansFromLayer('diagnostics'),
            applyExpandTo('line', 1),
            applyMerge()
        ),
        null,
        'visible-context'
    )

    .addLayer(
        spansCompose(
            spansFromLayer('visible-context'),
            applyInvert()
        ),
        spanHooksHide({
            skippedLines: () => '…'
        })
    );
```

The pipeline does not describe a sequence of output rewrites.

It declares:

* which source facts exist;
* which additional spans follow from them;
* which intermediate results have domain meaning;
* and how selected products contribute to the final representation.

Materialization is the final interpretation of that graph.

## Designing a layer

When adding a layer, ask the following questions.

### What spans does this layer own?

Use a source that expresses the domain result directly:

```text
diagnostics
search matches
visible context
omitted regions
marker boundaries
```

### Is this layer analytical or visible?

Use no hooks when it exists only for later derivation or introspection.

### Does it need a name?

Name it when:

* later layers depend on it;
* it has meaningful domain identity;
* it should be inspected or tested independently.

### Does it preserve source content?

Use wrapping or boundary output when the source content remains part of the result.

### Does it replace source content?

Use replacement when the selected region should be substituted.

### Is it inserting generated content?

Derive a point span at the intended source boundary.

### Is the interpretation output-specific?

Keep renderer-specific values in hooks or hook factories rather than in span data.

### Could the span cross another layer?

Ensure advanced hooks tolerate repeated materialized segments of one source span.

### Is analysis being performed too late?

If the hook discovers relationships or calculates new geometry, move that work into a span source or transformation.

## The materialization boundary

HiText keeps a deliberate boundary between two kinds of work.

Before the boundary:

```text
document analysis
span generation
span derivation
classification
grouping
selection
projection geometry
```

After the boundary:

```text
wrapping
replacement
generated values
text conversion
target-specific accumulation
output structure
```

The boundary is not absolute—hooks can inspect data and context—but it is a useful design discipline.

Before materialization, computations remain reusable and output-independent.

During materialization, those computations acquire a concrete representation.

That separation is what allows one stable source coordinate space to support overlapping annotations, derived views, omissions, generated content, and multiple output targets.

## From layers to precise rendering semantics

Most application views need only:

* span sources;
* transformations;
* named analytical layers;
* wrapping;
* replacement;
* a renderer.

More advanced integrations may need exact answers about:

* ordering equal and crossing spans;
* repeated segments;
* hook invocation order;
* replacement boundaries;
* renderer state;
* nested output buffers;
* interruption behavior.

Those mechanics define how arbitrary span intersections become a valid output structure.

The next guide focuses on that advanced rendering model.

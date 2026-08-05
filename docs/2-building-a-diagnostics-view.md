# Building a Diagnostic View

Suppose an analyzer reports a problem in a source file.

We want to build a compact diagnostic view that:

* preserves syntax highlighting;
* marks the reported source fragment;
* inserts a visible warning marker;
* retains one surrounding line;
* replaces the rest of the file with ellipses.

All annotations must continue to use offsets in the original source.

We will build the view one layer at a time.

## The source document

```js
const source = `import { openSocket } from './network.js';

export function connect(config) {
    const host = config.host ?? 'localhost';
    const port = Number(config.port);
    if (!Number.isInteger(port)) {
        throw new TypeError('Port must be an integer');
    }
    return openSocket(host, port);
}`;
```

The analyzer returns a diagnostic for `config.port`:

```js
const start = source.indexOf('config.port');

const diagnostics = [{
    start,
    end: start + 'config.port'.length,
    data: {
        severity: 'error',
        message: 'config.port may be undefined'
    }
}];
```

The diagnostic is already expressed as a span over the source document. HiText does not need to know how the analyzer found it.

## Mark the diagnostic

`spansFromOptions()` reads spans supplied with each render call:

```js
import {
    html,
    spansFromOptions
} from 'hitext';

const diagnosticSpans = spansFromOptions('diagnostics');

const view = html().addLayer(
    diagnosticSpans,
    (content, { data }) => {
        const severity = data.severity === 'error' ? 'error' : 'warning';
        return `<span class="diagnostic ${severity}">${content}</span>`;
    },
    'diagnostics'
);
```

Render the document with the analyzer result:

```js
view.render(source, { diagnostics });
```

The relevant fragment becomes:

```html
const port = Number(<span class="diagnostic error">config.port</span>);
```

The diagnostic layer does not modify the source string. It says only that one span should receive diagnostic interpretation when the view is materialized.

Its name, `diagnostics`, also makes its generated spans available to later layers.

## Add independent syntax spans

Syntax highlighting is a separate analysis. For this example, a regular expression is enough to identify several JavaScript keywords:

```js
import {
    html,
    spansFromMatch,
    spansFromOptions
} from 'hitext';

const keywordSpans = spansFromMatch(
    /\b(?:import|from|export|function|const|if|throw|new|return)\b/g
);

const diagnosticSpans = spansFromOptions('diagnostics');

const view = html()
    .addLayer(
        keywordSpans,
        content => `<span class="keyword">${content}</span>`
    )
    .addLayer(
        diagnosticSpans,
        (content, { data }) => {
            const severity = data.severity === 'error' ? 'error' : 'warning';
            return `<span class="diagnostic ${severity}">${content}</span>`;
        },
        'diagnostics'
    );
```

The keyword matcher does not know about diagnostics. The diagnostic provider does not know about syntax highlighting.

Both describe the same source coordinate space:

```text
keyword:       [-----)
diagnostic:                 [---------)
document:      const port = Number(config.port);
```

HiText combines their interpretations during rendering.

No layer parses markup emitted by another layer, and no offsets need to be translated.

## Derive an insertion point

The diagnostic identifies source content, but we also want to display a warning marker immediately after it.

We can derive a point span from the end boundary of every diagnostic span:

```js
import {
    applyCollapseTo,
    spansCompose,
    spansFromLayer
} from 'hitext';

const viewWithMarkers = view.addLayer(
    spansCompose(
        spansFromLayer('diagnostics'),
        applyCollapseTo('end')
    ),
    {
        replace: () =>
            '<span class="diagnostic-marker"> ⚠</span>'
    }
);
```

`applyCollapseTo('end')` does not create a new search or calculate another offset. It transforms each diagnostic span into a zero-width span at its end boundary.

```text
diagnostic:       [---------)
marker:                      |
```

A zero-width span consumes no source text. Its replacement inserts output at that boundary.

The rendered line now contains both the original diagnostic and the generated marker (formatted here for readability):

```html
const port = Number(
    <span class="diagnostic error">config.port</span>
    <span class="diagnostic-marker"> ⚠</span>
);
```

The marker is derived from the diagnostic. If the diagnostic moves, the marker moves with it.

## Derive the visible context

The complete source file is useful during editing, but a report or search result often needs only the surrounding context.

Start with the diagnostic spans and expand each one to its line plus one adjacent line:

```js
import {
    applyExpandTo,
    applyMerge,
    spansCompose,
    spansFromLayer
} from 'hitext';

const visibleSpans = spansCompose(
    spansFromLayer('diagnostics'),
    applyExpandTo('line', 1),
    applyMerge()
);
```

The transformation can be read from left to right:

```text
diagnostics
    → one line of surrounding context
    → merged visible regions
```

`applyMerge()` matters when several diagnostics are close to each other. Their context windows become one continuous visible region instead of several overlapping excerpts.

Add the result as an analytical layer:

```js
const viewWithContext = viewWithMarkers.addLayer(
    visibleSpans,
    null,
    'visible'
);
```

The layer has no rendering hooks. It exists only to name the computed visible regions for the next step.

## Derive everything that should be omitted

The `visible` layer describes what should remain.

To hide everything else, derive its complement:

```js
import {
    applyInvert,
    spansCompose,
    spansFromLayer
} from 'hitext';

const omittedSpans = spansCompose(
    spansFromLayer('visible'),
    applyInvert()
);
```

The relationship is geometric:

```text
document: [--------------------------------------------)
visible:              [----------------------)
omitted:  [-----------)                      [---------)
```

The omitted spans still refer to the original source document. Nothing has been cut or reindexed.

`applyInvert()` is designed for projections with at least one input span. Empty input produces no omitted spans rather than a span covering the whole document. Its default trailing boundary may extend to `document.length + 1`; pass `true` to `applyInvert(true)` when downstream code requires all coordinates to stay within the document length.

## Represent omissions

Add one final layer that replaces omitted regions with ellipses:

```js
import { spanHooksHide } from 'hitext';

const diagnosticExcerpt = viewWithContext.addLayer(
    omittedSpans,
    spanHooksHide({
        skippedLines: () => '…'
    })
);
```

Now render the same document and the same diagnostics:

```js
const result = diagnosticExcerpt.render(source, {
    diagnostics
});
```

Ignoring HTML styling, the resulting view is equivalent to:

```text
…
    const host = config.host ?? 'localhost';
    const port = Number(config.port ⚠);
    if (!Number.isInteger(port)) {
…
```

The source file has not been rewritten.

The diagnostic, keyword highlighting, marker insertion, visible context, and omissions all continue to use offsets in the original document.

## The complete view

The final pipeline can be written as one composition:

```js
import {
    applyCollapseTo,
    applyExpandTo,
    applyInvert,
    applyMerge,
    html,
    spanHooksHide,
    spansCompose,
    spansFromLayer,
    spansFromMatch,
    spansFromOptions
} from 'hitext';

const keywordSpans = spansFromMatch(
    /\b(?:import|from|export|function|const|if|throw|new|return)\b/g
);

const diagnosticSpans = spansFromOptions('diagnostics');

const diagnosticExcerpt = html()
    // Independent syntax annotations
    .addLayer(
        keywordSpans,
        content => `<span class="keyword">${content}</span>`
    )

    // Diagnostics supplied by the application
    .addLayer(
        diagnosticSpans,
        (content, { data }) => {
            const severity = data.severity === 'error' ? 'error' : 'warning';
            return `<span class="diagnostic ${severity}">${content}</span>`;
        },
        'diagnostics'
    )

    // A marker derived from each diagnostic boundary
    .addLayer(
        spansCompose(
            spansFromLayer('diagnostics'),
            applyCollapseTo('end')
        ),
        {
            replace: () =>
                '<span class="diagnostic-marker"> ⚠</span>'
        }
    )

    // Visible context derived from the diagnostics
    .addLayer(
        spansCompose(
            spansFromLayer('diagnostics'),
            applyExpandTo('line', 1),
            applyMerge()
        ),
        null,
        'visible'
    )

    // Everything outside the visible context
    .addLayer(
        spansCompose(
            spansFromLayer('visible'),
            applyInvert()
        ),
        spanHooksHide({
            skippedLines: () => '…'
        })
    );
```

The code describes relationships rather than an output-editing procedure:

```text
keywords
    └── presentation

diagnostics
    ├── presentation
    ├── end boundary
    │       └── warning marker
    └── surrounding context
            └── visible regions
                    └── omitted complement
                            └── ellipses
```

There is no sequence such as:

```text
highlight source
→ rewrite highlighted HTML
→ find diagnostics in rewritten HTML
→ cut the result
→ repair broken markup
```

Instead, every layer describes or derives spans over one document. HiText combines them only when the final representation is produced.

## What this view demonstrates

The example uses a small set of recurring HiText patterns.

### Independent annotations

Syntax and diagnostics are produced separately and composed without coordinating their output.

### Span derivation

The warning marker, context windows, and omitted regions are derived from earlier spans rather than found by rescanning the document.

### Analytical layers

The `visible` layer contributes no direct output. It names an intermediate span set used by another layer.

### Boundary insertion

Collapsing a span creates a point where generated content can be inserted without consuming source text.

### Projection

The final output contains only selected source regions while preserving annotations inside those regions.

### Late materialization

All span operations remain independent of output coordinates. This pipeline is configured for HTML up front, but HTML values are produced only when `.render()` evaluates and interprets the completed layer graph.

These patterns are not specific to diagnostics.

The same structure can produce search excerpts, diff context, focused logs, code review fragments, progressive disclosure, generated summaries, or budget-limited context for another system.

The inputs change. The composition model remains the same.

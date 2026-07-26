# Projections and Excerpts

A projection renders a selected view of a document while preserving annotations in source coordinates. Search snippets, code folds, redacted output, diagnostic excerpts, and compact reports are all projections.

The key property is that selection and annotation are resolved in one pipeline. HiText does not render markup first and cut it afterward.

## Why post-processing fails

Cutting completed output loses the source model:

- HTML tags can become unbalanced.
- DOM or JSX subtrees can be split at invalid boundaries.
- ANSI state can leak across omitted text.
- Source offsets no longer identify positions after markup is inserted.

In HiText, both visible windows and annotations remain ranges over the original document. Omitted ranges participate in the normal render traversal through replacement or hiding hooks.

## The basic composition

A common excerpt pipeline is:

```text
interesting ranges
    -> expand to context
    -> merge overlapping windows
    -> invert visible windows
    -> render omitted ranges with a placeholder
```

`applyInvert()` produces the gaps around the input ranges. Expanded line windows naturally overlap; inversion treats their union as visible, so adjacent windows do not create redundant omissions.

## Search excerpts

```js
import {
    applyExpandTo,
    applyInvert,
    html,
    rangesCompose,
    rangesForMatch,
    rangesFromLayer
} from 'hitext';

const excerpts = html()
    .addLayer(
        rangesForMatch(/match/g),
        content => `<mark>${content}</mark>`,
        'matches'
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('matches'),
            applyExpandTo('line', 1),
            applyInvert()
        ),
        { replace: () => '...\n' }
    );

const output = excerpts.render(
    'line1\nline2\nline3 match\nline4\nline5'
);

// ...
// line2
// line3 <mark>match</mark>
// line4
// ...
```

The first layer both identifies and renders matches. The named result is reused by the second layer to define the viewport. Highlighting survives because retained text is still rendered through the first layer.

## Horizontal context windows

`applyFitToWindow(size, allowTrimming?)` creates a character-width window within the line containing each input range:

```js
const snippets = html()
    .addLayer(
        rangesForMatch(/important keyword/gi),
        content => `<mark>${content}</mark>`,
        'matches'
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('matches'),
            applyFitToWindow(80)
        ),
        null,
        'windows'
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('windows'),
            applyInvert()
        ),
        rangeHooksHide()
    );
```

The transformer expands short matches toward an 80-character line window, redistributing unused space when it reaches a line boundary. A long match is trimmed from the right unless the second argument is `false`.

It does not accept separate `{ before, after }` values and does not cross line boundaries. Use a custom transformer when a projection needs asymmetric character context.

## Merge nearby windows

Expansion can make windows overlap. `applyInvert()` merges its input before computing gaps, so ordinary excerpt pipelines already avoid placeholders inside overlapping visible regions.

Use `applyMerge()` explicitly when a named visible-window layer, origin aggregation, or subsequent operation should observe the union itself:

```js
rangesCompose(
    rangesFromLayer('matches'),
    applyExpandTo('line', 2),
    applyMerge()
)
```

The merged range's origin array identifies the contributing windows.

## Smart omission markers

For mixed inline and line-oriented omissions, use `rangeHooksHide()`:

```js
import { rangeHooksHide } from 'hitext';

pipeline.addLayer(
    omittedRanges,
    rangeHooksHide({
        ellipsis: side => side === 'middle' ? '…' : '...',
        skippedLines: placement =>
            placement === 'both' ? '--- omitted ---' : '...'
    })
);
```

The helper distinguishes:

- a same-line gap, rendered with one middle ellipsis;
- a partial multi-line cut, with markers at the retained edges;
- complete skipped lines, with suitable leading or trailing newlines;
- document prefix and suffix omissions.

It sets `break: true` so omission boundaries interrupt surrounding ranges consistently. Marker callbacks can return the active renderer's child or result type, not only strings.

## Code folding

Folding is the same geometry with a domain-specific replacement. Define ranges for bodies, comments, generated blocks, or other foldable regions and replace them during rendering:

```js
const folded = html()
    .addLayer(
        bodyRanges,
        { replace: ({ rangeText }) => `{ /* ${rangeText.length} chars */ }` }
    );
```

Annotations fully inside a folded body are skipped. Ranges crossing the body boundary are segmented and may continue after it. Add `break: true` when the fold should force surrounding annotations to close at the fold boundary.

## Redaction

Redaction uses replacement but has a different trust requirement:

```js
const redacted = string().addLayer(
    sensitiveRanges,
    { replace: ({ rangeText }) => '*'.repeat(rangeText.length) }
);
```

Do not derive a supposedly secret replacement from data that leaks the hidden value. With HTML output, remember that hook results are not escaped automatically.

## Insertions

A zero-width replace range inserts synthetic output without consuming document text:

```js
html().addLayer(
    [[0, 0]],
    { replace: () => '<span class="label">Result: </span>' }
);
```

Use `rangesFrom('document-start')`, `rangesFrom('document-end')`, line boundary sources, or `applyCollapseTo()` to derive insertion points.

## Progressive detail

Render options can select different projections from one pipeline:

```js
pipeline.render(document, { detail: 'compact' });
pipeline.render(document, { detail: 'full' });
```

`rangesFromOptions()`, options-aware generators, and operation predicates can turn layers on or off or change context geometry. The source coordinate space remains stable across views.

HiText supplies the range composition and materialization model. It does not currently provide an optimizer that chooses ranges for a character, line, token, or relevance budget; applications can implement that policy in a source or transformer.

## Output budgets

A budget-aware projector usually separates policy from materialization:

```text
application policy
    -> rank important ranges
    -> choose ranges within a character, line, or token budget
HiText composition
    -> add context
    -> merge selected windows
    -> invert omissions
    -> render retained annotations and omission metadata
```

The policy may prioritize diagnostics, application frames, changed lines, headings, or relevance scores carried in range data. HiText provides operation context over the complete range set for custom selection, but it does not define what “most useful” means.

Budget the materialized representation, not only raw source characters, when generated labels or structured output contribute meaningful size. That accounting belongs to the application because renderer output units differ.

## Testing projections

Test geometry and output separately:

1. Call `pipeline.ranges(document, options)` and assert retained or omitted intervals.
2. Call `pipeline.render(document, options)` and assert placeholders plus surviving annotations.
3. Include no-match, document-edge, adjacent-window, overlapping-window, CRLF, and zero-width cases.

Keeping range assertions separate makes it clear whether a failure comes from selection policy or render traversal.

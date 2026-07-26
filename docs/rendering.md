# Rendering

A layer associates generated ranges with rendering behavior. HiText combines all renderable ranges, resolves their intersections, and materializes the result through the selected renderer.

This page documents the behavior application authors normally rely on. See [Renderers](renderers.md) for output-specific details and [API Reference](api-reference.md) for exact types.

## Range hook definitions

Pass a function when a range only needs to wrap its rendered content:

```js
pipeline.addLayer(
    ranges,
    content => `<mark>${content}</mark>`
);
```

The function is shorthand for:

```js
{
    wrap: content => `<mark>${content}</mark>`
}
```

Use an object for other behavior:

```js
{
    open: context => '<span>',
    close: context => '</span>',
    wrap: (content, context) => content,
    text: (documentChunk, context) => documentChunk,
    replace: context => 'replacement',
    break: false
}
```

A renderer-specific range hook factory can create hooks from renderer context. The built-in TTY style helpers use this form.

## Hook context

Callable range hooks receive:

| Field | Meaning |
|---|---|
| `document` | Complete input document |
| `offset` | Current document offset in the traversal |
| `line`, `column` | One-based position at `offset` |
| `start`, `end` | Current rendered segment boundaries |
| `range` | Complete generated range |
| `rangeIndex` | Stable identity across segments of one generated range |
| `rangeText` | `document.slice(range.start, range.end)` |
| `data` | Shortcut for `range.data` |
| `lines` | `LineBoundaries` helpers |
| `createBuffer()` | Creates a buffer compatible with the active renderer |
| `dump()` | Returns serializable context fields |

`start` and `end` describe the current segment. Use `range.start` and `range.end` when an operation needs the complete annotation.

Render options are not part of range hook context. They are available during range generation and transformation.

## Wrapping content

`wrap(content, context)` receives the result emitted for one rendered segment:

```js
{
    wrap: (content, { data }) =>
        `<span class="${data.kind}">${content}</span>`
}
```

The content type depends on the renderer: a string for string-based renderers, a `DocumentFragment` for DOM, and an array of children for JSX.

Crossing annotations can split one generated range into multiple segments, so `wrap`, `open`, and `close` may run more than once for that range. Use `rangeIndex` when state must correlate those calls.

## Nested and crossing ranges

Nested ranges map directly to nested output:

```text
A: [------------)
B:    [------)
```

Crossing ranges do not form a tree:

```text
A: [--------)
B:     [--------)
```

HiText temporarily closes and reopens ranges at crossing boundaries. Hooks see each resulting segment, while `context.range` and `rangeIndex` retain the identity of the complete generated range.

This is why independent annotation providers can overlap without coordinating their markup.

## Text conversion

`text(documentChunk, context)` converts or transforms source text before it is appended:

```js
{
    text: chunk => chunk.toUpperCase()
}
```

The nearest active range with a `text` hook controls a chunk. Otherwise the renderer's text hook is used. The HTML renderer uses its text hook to escape `&`, `<`, and `>`.

Values returned by `open`, `close`, `wrap`, and `replace` are already renderer output and do not pass through `text`.

## Replacement

`replace(context)` consumes a source interval and emits another value:

```js
pipeline.addLayer(
    rangesForMatch(/token=\w+/g),
    { replace: () => 'token=[redacted]' }
);
```

For a replacement segment, the hook order is:

```text
open -> replace -> wrap -> close
```

Source text and ranges fully contained by the replaced interval are skipped. A range crossing the replacement may continue afterward.

A zero-width replacement inserts output without consuming source text:

```js
pipeline.addLayer(
    [[0, 0]],
    { replace: () => 'Prefix: ' }
);
```

## Breaking surrounding ranges

Ordinary surrounding ranges can span a replacement:

```js
string()
    .addLayer([[0, 11]], {
        open: () => '<a>',
        close: () => '</a>'
    })
    .addLayer([[4, 7]], { replace: () => 'X' })
    .render('AAA BBB CCC');
// <a>AAA X CCC</a>
```

Set `break: true` when a generated boundary must interrupt surrounding annotations:

```js
string()
    .addLayer([[0, 11]], {
        open: () => '<a>',
        close: () => '</a>'
    })
    .addLayer([[4, 7]], {
        replace: () => 'X',
        break: true
    })
    .render('AAA BBB CCC');
// <a>AAA </a>X<a> CCC</a>
```

## Hiding omitted regions

`rangeHooksHide()` creates line-aware omission behavior for excerpts:

```js
pipeline.addLayer(
    omittedRanges,
    rangeHooksHide({
        ellipsis: '…',
        skippedLines: '...'
    })
);
```

It distinguishes inline gaps, complete skipped lines, and partial multi-line cuts, and sets `break: true` so omission boundaries interrupt surrounding ranges consistently.

For a fixed literal replacement, use `replace` directly.

## Buffers and output

A renderer creates a root buffer. A range with `wrap` accumulates its nested content in a child buffer, calls `emit()`, and passes that result to `wrap`. `render()` returns the root buffer's emitted result.

This common traversal supports strings, HTML, terminal output, DOM, JSX, and application-defined structures. Custom renderer construction is covered in [Renderers](renderers.md#custom-renderers).

## Ordering at equal boundaries

At the same start offset, replacement and `break` behavior take priority, longer ranges open before shorter ones, and earlier `addLayer()` layers take priority when geometry is otherwise equal. Duplicate ranges are preserved.

When every comparison key is equal, stable sorting preserves generation order. Several ordinary point insertions in one layer therefore keep source order; equal points in different `addLayer()` layers follow layer order.

When several insertions share an offset, put them in deliberate layer and source order and test the exact result.

These guarantees describe pipelines built with `addLayer()`, which creates insertion-ordered symbol markers. Low-level `createPipelineNode()` callers can supply string or numeric markers; JavaScript own-key ordering then affects marker priority. That low-level surface is under review before the 2.0 release.

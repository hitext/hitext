# Range Hooks

Range hooks describe how a generated range participates in rendering. A layer attaches a hook definition to its range source:

```js
pipeline.addLayer(ranges, rangeHooks, name);
```

The definition can be a partial hooks object, a `wrap` shortcut, a renderer-specific factory, or `null`.

## Definition forms

For simple wrapping, pass a function:

```js
content => `<mark>${content}</mark>`
```

It is normalized to:

```js
{
    wrap: content => `<mark>${content}</mark>`
}
```

Use an object when a layer needs another lifecycle hook:

```js
{
    open: ({ data }) => `<span class="${data.kind}">`,
    close: () => '</span>'
}
```

Renderer helpers such as `tty.createStyle()` return a factory with `createRangeHooks()`. The factory is resolved against context supplied by that renderer.

## Hook context

Callable hooks receive a context with these fields:

| Field | Meaning |
|---|---|
| `hook` | Hook currently being executed: `open`, `close`, `wrap`, `text`, or `replace` |
| `document` | Complete source document |
| `lines` | `LineBoundaries` helpers for the document |
| `offset` | Current source offset in the render traversal |
| `line`, `column` | One-based position at `offset` |
| `start`, `end` | Current segment boundaries |
| `rangeIndex` | Stable identity of the generated range in this render |
| `rangeText` | `document.slice(range.start, range.end)` |
| `range` | Complete generated range, including original boundaries and marker |
| `data` | Shortcut for `range.data` |
| `createBuffer()` | Creates a buffer compatible with the active renderer |
| `dump()` | Returns the serializable context fields |

`start` and `end` are segment boundaries. Use `range.start` and `range.end` when the operation needs the complete source annotation.

## `open` and `close`

`open(context)` emits before a range segment, and `close(context)` emits after it:

```js
{
    open: () => '<mark>',
    close: () => '</mark>'
}
```

Crossing ranges can split one range into multiple segments, so each hook may be called more than once for a generated range. Do not assume that one source range always produces one open/close pair.

`open` and `close` append directly to the current parent buffer. They are useful for text renderers and for renderer factories that maintain state, such as the TTY style stack.

## `wrap`

`wrap(content, context)` receives the emitted content of a segment's child buffer:

```js
{
    wrap: (content, { data }) =>
        `<span class="${data.kind}">${content}</span>`
}
```

This is usually the most portable way to create a container. `content` has the renderer's result type: a string for string-based renderers, a `DocumentFragment` for DOM, and an array of children for JSX.

## `text`

`text(documentChunk, context)` converts or transforms source text before it is appended:

```js
{
    text: chunk => chunk.toUpperCase()
}
```

The nearest active range with a `text` hook controls a chunk. If no range supplies one, the renderer's text hook is used. This is how the HTML renderer escapes document text and the DOM renderer creates text nodes through its buffer.

The text hook is not applied to values returned by other hooks. Hook output is already renderer output, not source document text.

## `replace`

`replace(context)` substitutes a range:

```js
{
    replace: ({ rangeText }) => `[${rangeText.length} chars hidden]`
}
```

For a replace range, HiText:

1. Renders source text up to the range start.
2. Opens the replace segment.
3. Appends the value returned by `replace`.
4. Advances the source offset to the range end.
5. Wraps and closes the segment when those hooks are present.

Source text and ranges fully contained by the replaced interval are skipped. A range that crosses the replaced interval may continue after it.

Hook order for a replacement segment is:

```text
open -> replace -> wrap -> close
```

A zero-width replace range inserts output without consuming source text:

```js
pipeline.addLayer(
    [[0, 0]],
    { replace: () => 'Prefix: ' }
);
```

## `break`

`break` is a boolean flag rather than a callable hook. It gives the range stronger interruption behavior during ordering and segmentation:

```js
{
    replace: () => '...',
    break: true
}
```

Without `break`, a surrounding range can span a replacement and continue afterward. With `break`, active ranges are closed at the new range boundary and reopened as needed after it. This is useful when a generated output boundary must not remain inside a surrounding annotation.

## Hiding content

`rangeHooksHide()` returns hooks for omission-aware hiding. Unlike a fixed empty replacement, it can preserve line structure according to its options and the hidden range's position.

```js
import { rangeHooksHide } from 'hitext';

pipeline.addLayer(hiddenRanges, rangeHooksHide());
```

For a literal placeholder, use `replace` directly. For line-aware omission, use `rangeHooksHide()` and see [Projections and Excerpts](projections-and-excerpts.md).

## Renderer-specific factories

A range hook factory defers hook creation until the pipeline resolves hooks for its renderer:

```ts
type RangeHooksFactory<Data, T, R, HC> = {
    createRangeHooks(context: HC): Partial<RangeHooks<Data, T, R>> | null;
};
```

TTY style helpers use this mechanism because they need access to the renderer's style stack. A factory intended for one renderer should not be assumed to work with another renderer unless its context contract says so.

## Side effects

Hooks execute during traversal and may run multiple times because of segmentation. Prefer deriving output from hook arguments. When state is necessary, key it by `rangeIndex` or implement it as part of a renderer factory that explicitly manages lifecycle state.

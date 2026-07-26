# Rendering Model

HiText accepts arbitrary interval intersections but most output formats require a properly nested traversal. The render engine bridges those models by ordering ranges, maintaining an active stack, and exposing interrupted pieces as segments.

## Range ordering

Before traversal, `render()` removes ranges that:

- have no resolved hooks;
- have `start > end`;
- have non-finite boundaries.

Remaining ranges are copied and sorted without mutating the generated range array. The comparison is:

1. Smaller `start` first.
2. Greater interruption weight first at the same start.
3. Greater `end` first.
4. Earlier resolved layer marker first.

Interruption weight is:

```text
(break ? 2 : 0) + (replace ? 1 : 0)
```

Therefore a `break` replacement sorts ahead of an ordinary replacement, which sorts ahead of an ordinary annotation at the same start. Longer ranges open before shorter ones when the preceding criteria are equal.

When all comparison keys tie, JavaScript's stable sort preserves generation order. The practical cases are:

| Case | Order |
|---|---|
| Identical ranges in one layer | Source iteration order |
| Duplicate ranges | Preserved; duplicates are not deduplicated |
| Equal ranges in different layers | Earlier resolved layer first |
| Point and interval at one offset | Interruption weight first, then the interval's greater `end` |
| Several ordinary point insertions | Earlier layer first; points within one layer keep source order |

Use explicit layer and source order for equal-boundary insertions, and assert exact output when ordering is significant.

These layer-priority guarantees describe pipelines built with `addLayer()`, whose markers are insertion-ordered symbols. Low-level callers can supply string or numeric markers; JavaScript own-key ordering then affects the marker priority returned by `Reflect.ownKeys()`.

Rendering does not clamp finite ranges to document bounds. Application sources and transformers should normally produce document-relative offsets. String slicing naturally limits emitted source text, but out-of-bounds hook context remains the supplied geometry.

## Nested ranges

Nested intervals map directly to nested output:

```text
A: [------------)
B:    [------)
```

The lifecycle is:

```text
open A
  text
  open B
    text
  close B
  text
close A
```

If `wrap` is used, each range's content is collected in its own child buffer before the wrap result is appended to its parent.

## Crossing ranges

Crossing intervals cannot both remain open in a tree:

```text
A: [--------)
B:     [--------)
```

At the start of B, A is temporarily closed because A ends before B. The renderer then opens B and reopens the unfinished portion of A inside the order required by the active stack.

Conceptually:

```text
A segment 1: [---)
B:               [--------)
A segment 2:     [----)
```

The precise nesting is determined by range ordering and end positions. What matters to hook authors is that one generated range may produce several segment lifecycles.

## Segments and identity

Hook context separates segment geometry from range identity:

| Field | Meaning |
|---|---|
| `start`, `end` | Boundaries of the current segment |
| `range.start`, `range.end` | Boundaries of the complete generated range |
| `rangeIndex` | Stable numeric identity for all segments of that range |
| `rangeText` | Text of the complete generated range |

Use segment boundaries to describe the current hook event. Use range boundaries or `rangeText` for annotation-level metadata.

## Active stack

The render engine keeps active ranges ordered by descending end. `rangeStackOpenIndex` separates ranges currently open in the output from unfinished ranges waiting to reopen.

For each new range, traversal:

1. Closes ranges completed before its start.
2. Renders source text up to the event boundary.
3. Temporarily closes active ranges that cannot contain the new interval.
4. Inserts or handles the new range.
5. Reopens unfinished ranges in stack order.

After the last start event, traversal closes ranges through the document end, then closes any remaining out-of-bounds intervals.

This close/reopen behavior is why hook side effects must tolerate multiple segments.

## Ordinary hook lifecycle

Opening an ordinary segment:

1. Sets `context.range`, segment start, and lazily computed segment end.
2. Calls `open`, appending its result to the current buffer.
3. Creates a child buffer when `wrap` exists.
4. Renders source chunks and nested ranges.

Closing it:

1. Calls `emit()` on the child buffer and passes the emitted result to `wrap`, when present.
2. Appends the wrap result to the restored parent buffer.
3. Calls `close` and appends its result.

In shorthand:

```text
open -> text/nested content -> wrap -> close
```

`open` is outside the wrap buffer, as is `close`. They are siblings of the wrapped result rather than children of it.

## Text hook selection

Before appending a source chunk, traversal walks active ranges from inner to outer and selects the nearest non-null `text` hook. If none exists, it uses the renderer's text hook.

This permits a range to override HTML escaping or produce renderer-specific text units for its region. Values returned by `open`, `close`, `wrap`, and `replace` are already output values and do not pass through `text`.

## Replacement

A range with `replace` consumes its source interval. The lifecycle is:

```text
open -> replace -> wrap -> close
```

Traversal advances directly from the replacement start to its end. Ranges fully inside that interval are skipped. A later range beginning inside the replacement but ending after it may be added to the active stack so it can continue beyond the replaced interval.

Ordinary surrounding ranges can span a replacement. Add `break: true` when the replacement should force all active ranges to close at its boundary.

## Zero-width ranges

A range with equal boundaries consumes no source text. With `replace`, it inserts output at that offset:

```js
{
    start: offset,
    end: offset
}
```

At equal starts, interruption weight, end, and layer priority determine ordering among points and intervals. When insertion order matters, use separate layers in deliberate order and test the emitted result.

See the [range ordering table](#range-ordering) for complete-tie and duplicate behavior.

## Buffer nesting

Only `wrap` requires a nested buffer. The engine pushes the current buffer, creates a compatible child through the renderer's buffer factory, and restores the parent when the segment closes.

This gives `wrap` a complete renderer-native result:

- a string for string, HTML, and TTY pipelines;
- a `DocumentFragment` for DOM;
- an array of children for JSX;
- the custom result type for another renderer.

Nested buffers are created per segment, not necessarily once per generated range.

## Renderer-independent guarantees

All renderers share:

- generated range filtering and ordering;
- stack and segment behavior;
- source offsets and hook context;
- replacement and break semantics;
- nested buffer lifecycle;
- stable `rangeIndex` within one render call.

Renderers choose buffer values, source text conversion, document-level lifecycle output, and factory context.

## Renderer-specific behavior

The built-in renderers differ in observable ways:

- HTML escapes source chunks but trusts hook output.
- TTY maintains foreground and background style state across nested segments.
- DOM converts appended strings to text nodes and emits a fragment.
- JSX collects primitives and element-like values supplied by hooks.

See [Renderers](renderers.md) for their contracts.

## Debugging traversal

There is no public `segments()` method in 2.0. To inspect segment events, attach temporary hooks that record context:

```js
const events = [];

const traceHooks = {
    open: context => {
        events.push({ event: 'open', ...context.dump() });
    },
    close: context => {
        events.push({ event: 'close', ...context.dump() });
    }
};
```

Use one trace layer at a time when investigating ordering. Compare `rangeIndex`, `start/end`, and `range.start/end` to distinguish interruption from duplicate generation.

For generated geometry and hook resolution before traversal, see [Introspection and Debugging](introspection-and-debugging.md).

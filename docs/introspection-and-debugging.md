# Introspection and Debugging

HiText exposes range generation, hook definitions, hook resolution, and rendering separately. Debug the earliest stage that can explain a mismatch instead of starting from completed markup or nodes.

## Inspect generated ranges

`pipeline.ranges()` evaluates every layer without rendering:

```js
const ranges = pipeline.ranges(document, renderOptions);

console.table(ranges.map(range => ({
    type: String(range.type),
    start: range.start,
    end: range.end,
    data: range.data
})));
```

Check these questions first:

- Are offsets in the original document coordinate space?
- Is `end` exclusive?
- Did the intended layer generate a range?
- Did a transformation produce the expected geometry and data?
- Does a derivative have the expected origin?

Rendering filters invalid ranges, but generation retains them. That makes `ranges()` the right place to find non-finite or reversed boundaries.

## Group ranges by layer

Generated `type` values match layer markers:

```js
for (const layer of pipeline.layers) {
    const layerRanges = ranges.filter(
        range => range.type === layer.marker
    );

    console.log(layer.name, layerRanges);
}
```

This avoids relying on a symbol's display string. It also reveals analytical layers that generate ranges but intentionally have null hooks.

## Inspect dependencies

List layer order and names:

```js
console.table(pipeline.layers.map((layer, index) => ({
    index,
    name: layer.name,
    marker: String(layer.marker),
    renders: layer.rangeHooks != null
})));
```

If `rangesFromLayer(name)` produces nothing, verify that:

- the named layer appears earlier;
- spelling and case match;
- the upstream source produced ranges for this document and option set;
- duplicate names have not replaced the intended entry in `rangesByName`.

## Inspect hook definitions

`rangeHooksDefinitionMap()` returns an object keyed by layer markers:

```js
const definitions = pipeline.rangeHooksDefinitionMap();

for (const marker of Reflect.ownKeys(definitions)) {
    console.log(marker, definitions[marker]);
}
```

Values retain their input form. A function is still a `wrap` shorthand, and a range hook factory is not yet expanded.

Use `Reflect.ownKeys()` rather than `Object.keys()`, because default layer markers are symbols.

## Inspect resolved hooks

`rangeHooksMap()` returns another marker-keyed object after resolving shortcuts and range hook factories:

```js
const hooks = pipeline.rangeHooksMap();

for (const marker of Reflect.ownKeys(hooks)) {
    console.log(marker, {
        open: hooks[marker].open != null,
        close: hooks[marker].close != null,
        wrap: hooks[marker].wrap != null,
        text: hooks[marker].text != null,
        replace: hooks[marker].replace != null,
        break: hooks[marker].break
    });
}
```

Calling this method creates a fresh renderer hook context. Do not use a resolved map from one call as a way to inspect mutable state during a separate `render()` call.

## Visualize overlaps

For a small document, a boundary table is often clearer than completed output:

```js
const boundaries = ranges.flatMap(range => [
    { offset: range.start, event: 'start', range },
    { offset: range.end, event: 'end', range }
]);

boundaries.sort((a, b) => a.offset - b.offset);
console.table(boundaries);
```

Inspect ranges from one or two layers at a time. A crossing exists when:

```text
A.start < B.start < A.end < B.end
```

Crossings are valid. They explain repeated segment hooks, not duplicated ranges.

## Trace segments

Segments are observable through hook context even though there is no public segment-list API:

```js
const events = [];

const trace = {
    open(context) {
        events.push({ event: 'open', ...context.dump() });
    },
    close(context) {
        events.push({ event: 'close', ...context.dump() });
    },
    wrap(content, context) {
        events.push({ event: 'wrap', ...context.dump() });
        return content;
    }
};
```

Compare:

- `rangeIndex` to correlate segments of one generated range;
- `start/end` for the current segment;
- `range.start/end` for the complete annotation;
- `hook` for lifecycle order;
- `offset`, `line`, and `column` for traversal position.

## Trace origin

Origin can be a record or an array. A small recursive formatter makes lineage visible:

```js
function dumpOrigin(origin) {
    if (Array.isArray(origin)) {
        return origin.map(dumpOrigin);
    }

    if (!origin) {
        return null;
    }

    return {
        start: origin.start,
        end: origin.end,
        data: origin.data,
        origin: dumpOrigin(origin.origin)
    };
}
```

Check the transformer reference before treating missing origin as a bug. Inversion has no direct source interval, and data mapping clears origin by design.

## Debug replacements

When content disappears unexpectedly, inspect replace ranges before ordinary annotations. A replacement skips source text and fully contained ranges.

Log:

```js
{
    rangeText: context.rangeText,
    segment: [context.start, context.end],
    range: [context.range.start, context.range.end],
    break: resolvedHooks[context.range.type].break
}
```

Pay special attention to inversion's extended document-end boundary and to zero-width insertions sharing an offset.

## Debug custom renderers

Instrument the buffer protocol:

```js
function createDebugBuffer() {
    const children = [];

    return {
        append(child) {
            console.log('append', child);
            children.push(child);
        },
        emit() {
            console.log('emit', children);
            return children;
        }
    };
}
```

Test plain text first, then one `wrap`, nesting, a crossing, replacement, and a zero-width insertion. If strings work but object output does not, the usual fault is that `append()` cannot accept both child values and emitted nested results.

## Common problems

### Correct text, wrong markup nesting

Inspect crossing geometry and hook segment assumptions. One range can execute `open`, `wrap`, and `close` more than once.

### Expected layer has no effect

Check whether it has null hooks. Analytical layers generate ranges but are omitted from render traversal.

### Named layer is empty

Confirm order, name uniqueness, upstream options, and source output.

### HTML is escaped twice

Source chunks are escaped by `html()`. Hook output is not. Return markup from hooks, and do not pre-escape content already supplied to `wrap`.

### HTML contains unsafe values

Automatic escaping does not apply to hook output or interpolated range data. Escape or validate application values before inserting them into markup.

### Origin vanished

Check operation semantics. `applyDataMap()` and `applyResetOrigin()` clear it; `applyInvert()` creates unrelated gaps.

### Insertion order is surprising

Several zero-width ranges at one offset are ordered by interruption flags, geometry, and layer priority. Put insertions in deliberate layer order and assert exact output.

### TTY style leaks

Use `tty.createStyle()` or `tty.createStyleMap()` rather than raw ANSI wrappers when annotations can nest or cross. The TTY renderer and its range hook factories manage restoration through the style stack.

## A debugging sequence

Use this order to localize failures:

1. Verify source offsets with `document.slice(start, end)`.
2. Inspect `pipeline.ranges()` and group by marker.
3. Verify named layer order and render options.
4. Inspect hook definitions and resolved hooks.
5. Record segment events for the smallest crossing case.
6. Instrument custom buffers or renderer lifecycle.
7. Assert the final output only after earlier stages are correct.

# Creating a Custom Renderer

Built-in HiText renderers cover common output targets:

```js
string()
html()
tty()
dom()
jsx()
```

A custom renderer is useful when the desired result is not merely formatted text.

An application may need:

* a JSON-compatible annotation tree;
* nodes for a custom UI framework;
* an event sequence;
* a report model;
* a test-friendly structural representation;
* an intermediate format consumed by another system.

The analytical span sources and transformations do not need to change for these targets. A custom renderer defines how source text and target-specific layer interpretations become an output value in a renderer-specific pipeline.

In this guide, we will build a renderer that produces a JSON-compatible tree.

This guide assumes the layer and buffer model from [Layers and Materialization](5-layers-and-materialization.md) and the segment model from [Rendering Overlapping Spans](6-rendering-overlapping-spans.md).

## The target representation

Given this source:

```js
const source = 'Hello world';
```

and a span over `world`, we want this result:

```js
[
    {
        type: 'text',
        value: 'Hello '
    },
    {
        type: 'annotation',
        kind: 'subject',
        children: [
            {
                type: 'text',
                value: 'world'
            }
        ]
    }
]
```

The source span still describes the original document:

```js
{
    start: 6,
    end: 11,
    data: {
        kind: 'subject'
    }
}
```

The renderer decides that ordinary source chunks become text nodes. The layer interpretation decides that the selected span becomes an annotation node.

This preserves the usual HiText separation:

```text
span source
    → what part of the document is described

layer interpretation
    → what that span means in this view

renderer
    → how the complete result is represented
```

## Start with a buffer

A renderer needs somewhere to accumulate its output.

For the tree renderer, the buffer contains an array of nodes:

```js
function createTreeBuffer() {
    const children = [];

    return {
        append(child) {
            children.push(child);
        },

        emit() {
            return children;
        }
    };
}
```

This is the essential buffer protocol:

```text
append a child
emit the completed result
```

The result of this buffer is an array.

However, a materialized span may itself emit an array of children. Appending that array as one value would produce unnecessary nesting:

```js
[
    { type: 'text', value: 'Hello ' },
    [
        { type: 'text', value: 'world' }
    ]
]
```

For this renderer, nested emitted arrays should be flattened into the parent:

```js
function createTreeBuffer() {
    const children = [];

    return {
        append(child) {
            if (Array.isArray(child)) {
                children.push(...child);
            } else {
                children.push(child);
            }
        },

        emit() {
            return children;
        }
    };
}
```

This flattening is not a universal renderer rule. It is a choice in the target representation.

A different renderer might intentionally preserve nested arrays as meaningful groups.

## Handle nested empty values deliberately

HiText omits direct `null`, `undefined`, and empty-string hook results before calling `buffer.append()`. A custom buffer may still encounter nullish values nested inside an emitted array or appended manually through a buffer created from hook context.

This tree buffer chooses to omit such nested values:

```js
function createTreeBuffer() {
    const children = [];

    function append(child) {
        if (child == null) {
            return;
        }

        if (Array.isArray(child)) {
            for (const item of child) {
                append(item);
            }

            return;
        }

        children.push(child);
    }

    return {
        append,

        emit() {
            return children;
        }
    };
}
```

This gives nested and manually appended values a clear accumulation policy:

```text
nullish value
    → omit

array
    → append its items

other value
    → append as one child
```

The top-level render traversal already handles empty hook results; this policy makes recursive array flattening consistent with it.

## Convert source text into nodes

The buffer can accumulate nodes, but the source document still arrives as string chunks.

The renderer needs a default interpretation for ordinary source text:

```js
function textNode(value) {
    return {
        type: 'text',
        value
    };
}
```

Now create a renderer pipeline:

```js
import { createRenderPipeline } from 'hitext';

const tree = createRenderPipeline(() => ({
    createBuffer: createTreeBuffer,

    text(value) {
        return textNode(value);
    }
}));
```

The factory returns the renderer behaviour for one materialization.

Without any layers:

```js
tree.render('Hello world');
```

produces:

```js
[
    {
        type: 'text',
        value: 'Hello world'
    }
]
```

The renderer has established two rules:

```text
source text
    → text node

collected children
    → array
```

It still knows nothing about diagnostics, search matches, syntax, or any other span meaning.

## Add an interpreted span

Create one span over `world`:

```js
const subjectSpans = [{
    start: 6,
    end: 11,
    data: {
        kind: 'subject'
    }
}];
```

Attach it to the tree renderer:

```js
const view = tree.addLayer(
    subjectSpans,
    {
        wrap(children, { data }) {
            return {
                type: 'annotation',
                kind: data.kind,
                children
            };
        }
    }
);
```

Render the document:

```js
view.render('Hello world');
```

The result is:

```js
[
    {
        type: 'text',
        value: 'Hello '
    },
    {
        type: 'annotation',
        kind: 'subject',
        children: [
            {
                type: 'text',
                value: 'world'
            }
        ]
    }
]
```

The renderer produced text nodes.

The layer hook produced the annotation node.

Neither responsibility needs to know how the other was implemented.

## Why `wrap()` receives children

When a span uses `wrap()`, HiText materializes its contents into a child buffer.

Conceptually:

```text
create child buffer
    → append source text and nested spans
    → emit child result
    → pass result to wrap()
    → append wrapper result to parent
```

For the tree renderer, the child result is an array of nodes:

```js
[
    {
        type: 'text',
        value: 'world'
    }
]
```

The hook converts that array into one annotation node:

```js
{
    type: 'annotation',
    kind: 'subject',
    children
}
```

This is why the same rendering model works for both strings and trees.

For HTML, completed children may be a string.

For DOM, they may be a fragment.

For the custom renderer, they are an array of structured nodes.

## Nested spans become nested nodes

Add a second span inside `world`:

```js
const outerSpans = [{
    start: 6,
    end: 11,
    data: {
        kind: 'subject'
    }
}];

const innerSpans = [{
    start: 7,
    end: 10,
    data: {
        kind: 'emphasis'
    }
}];
```

Build the view:

```js
const nestedView = tree
    .addLayer(
        outerSpans,
        {
            wrap(children, { data }) {
                return {
                    type: 'annotation',
                    kind: data.kind,
                    children
                };
            }
        }
    )
    .addLayer(
        innerSpans,
        {
            wrap(children, { data }) {
                return {
                    type: 'annotation',
                    kind: data.kind,
                    children
                };
            }
        }
    );
```

Rendering `Hello world` produces a nested structure equivalent to:

```js
[
    {
        type: 'text',
        value: 'Hello '
    },
    {
        type: 'annotation',
        kind: 'subject',
        children: [
            {
                type: 'text',
                value: 'w'
            },
            {
                type: 'annotation',
                kind: 'emphasis',
                children: [
                    {
                        type: 'text',
                        value: 'orl'
                    }
                ]
            },
            {
                type: 'text',
                value: 'd'
            }
        ]
    }
]
```

The renderer does not need special logic for annotation nesting.

Nested buffers and `wrap()` naturally construct the tree.

## Crossing spans may produce several nodes

As described in [Rendering Overlapping Spans](6-rendering-overlapping-spans.md#layer-order-decides-which-crossing-span-is-segmented), a crossing may divide one generated span into several properly nested materialized segments. For a structured renderer, each segment may become a separate annotation node.

The target-specific consequence is:

> One span does not necessarily correspond to one output node.

A custom renderer should not invent node identity from hook invocation count.

When several materialized nodes need to be associated with the same generated span, include its per-render index from the hook context:

```js
{
    wrap(children, context) {
        return {
            type: 'annotation',
            spanIndex: context.spanIndex,
            kind: context.data.kind,
            children
        };
    }
}
```

The public property is `spanIndex`. It remains stable across all segments of the same generated span within one render, but it is not a persistent identifier across render calls. See [Span Hook Context](pipeline-and-rendering-reference.md#span-hook-context) for the complete context contract.

## Represent source and segment geometry separately

A structural output may need both the complete analytical span and the current segment.

For example:

```js
{
    wrap(children, context) {
        return {
            type: 'annotation',

            span: {
                start: context.span.start,
                end: context.span.end
            },

            segment: {
                start: context.start,
                end: context.end
            },

            data: context.data,
            children
        };
    }
}
```

This makes segmentation visible in the output:

```js
{
    type: 'annotation',
    span: {
        start: 6,
        end: 20
    },
    segment: {
        start: 6,
        end: 12
    },
    children: [...]
}
```

A later segment can retain the same complete span range with different segment geometry.

This is useful for:

* debugging;
* annotation export;
* linking rendered nodes to analysis;
* reconstructing relationships between segments;
* building interactive views.

Do not expose segment geometry when the consumer does not need it. A simpler target model is easier to use and more stable.

## Replacement becomes another node type

A custom renderer can represent replacement without converting it to a string.

Suppose secret values should become redaction nodes:

```js
const redactedView = tree.addLayer(
    spansFromMatch(/token=\w+/g),
    {
        replace(context) {
            return {
                type: 'redaction',
                reason: 'secret',
                sourceRange: {
                    start: context.span.start,
                    end: context.span.end
                }
            };
        }
    }
);
```

Rendering:

```js
redactedView.render('request token=secret');
```

may produce:

```js
[
    {
        type: 'text',
        value: 'request '
    },
    {
        type: 'redaction',
        reason: 'secret',
        sourceRange: {
            start: 8,
            end: 20
        }
    }
]
```

The covered source text is consumed by replacement, just as it would be for a string renderer.

Only the replacement value differs.

## Point spans become insertion nodes

A point span can insert a structured node at a source boundary:

```js
const markerSpans = spansCompose(
    spansFromLayer('diagnostics'),
    applyCollapseTo('end')
);
```

Interpret it:

```js
.addLayer(
    markerSpans,
    {
        replace({ data }) {
            return {
                type: 'marker',
                kind: 'diagnostic',
                severity: data.severity
            };
        }
    }
)
```

Because the span is zero-width, no source text is consumed.

The marker node appears between the text nodes corresponding to the surrounding source regions. Its default depth follows layer registration order: earlier layers wrap it and later layers do not. Set `point: 'inside'` or `point: 'outside'` when the node must sit inside or outside every non-replacement span touching that boundary.

This makes the same boundary-insertion pattern usable for:

* warnings;
* line numbers;
* footnote references;
* generated summaries;
* section controls;
* application-specific metadata nodes.

## Keep source text conversion in the renderer

It may be tempting to create text nodes from every span hook:

```js
{
    wrap(content) {
        return {
            type: 'annotation',
            children: [{
                type: 'text',
                value: content
            }]
        };
    }
}
```

That would be incorrect for nested or structured child content. `content` is already the emitted result of the child buffer, not necessarily a plain source string.

Text conversion belongs in the renderer:

```js
text(value) {
    return {
        type: 'text',
        value
    };
}
```

Hooks should operate on renderer-native child results:

```js
wrap(children) {
    return {
        type: 'annotation',
        children
    };
}
```

This keeps ordinary source text and nested interpreted content composable.

## Decide what strings mean

The buffer may receive strings from several places:

* a renderer or span `text` hook that deliberately returns a string;
* hooks that return literal strings;
* built-in helpers designed for string renderers;
* custom interpretation code.

A structured renderer should define whether raw strings are accepted as valid child values.

One option is to normalize every string inside the buffer:

```js
function createTreeBuffer() {
    const children = [];

    return {
        append(child) {
            if (child == null) {
                return;
            }

            if (Array.isArray(child)) {
                for (const item of child) {
                    this.append(item);
                }

                return;
            }

            if (typeof child === 'string') {
                children.push({
                    type: 'text',
                    value: child
                });

                return;
            }

            children.push(child);
        },

        emit() {
            return children;
        }
    };
}
```

This makes the buffer tolerant of hooks that return strings.

Another option is stricter: require every hook to return a valid node and throw on unexpected strings.

The choice depends on the renderer’s purpose.

A general-purpose renderer may favor normalization.

An internal IR renderer may favor strict validation.

## Normalize adjacent text nodes

The current renderer may produce adjacent text nodes:

```js
[
    { type: 'text', value: 'Hello ' },
    { type: 'text', value: 'world' }
]
```

If this distinction is not meaningful, the buffer can combine them:

```js
function appendText(children, value) {
    const last = children[children.length - 1];

    if (last?.type === 'text') {
        last.value += value;
    } else {
        children.push({
            type: 'text',
            value
        });
    }
}
```

Use it in the buffer:

```js
function createTreeBuffer() {
    const children = [];

    return {
        append(child) {
            if (child == null) {
                return;
            }

            if (Array.isArray(child)) {
                for (const item of child) {
                    this.append(item);
                }

                return;
            }

            if (typeof child === 'string') {
                appendText(children, child);
                return;
            }

            if (child.type === 'text') {
                appendText(children, child.value);
                return;
            }

            children.push(child);
        },

        emit() {
            return children;
        }
    };
}
```

This is a target-level normalization policy.

HiText should not impose it globally, because another renderer may need to preserve exact segmentation.

## Expose hook-factory helpers

Some renderers need hook definitions that depend on renderer-owned behaviour or state.

A renderer can expose a value specifically for span-hook factories through `spanHooksContext`.

In the current API, the names are deliberately span-specific: the renderer exposes `spanHooksContext`, and a layer factory implements `createSpanHooks()`. This channel supplies factory dependencies; it is distinct from both renderer hooks and the `SpanHookContext` passed to hook invocations.

For example, the tree renderer may provide node constructors:

```js
const tree = createRenderPipeline(() => ({
    createBuffer: createTreeBuffer,

    text(value) {
        return {
            type: 'text',
            value
        };
    },

    spanHooksContext: {
        annotation(kind, data, children) {
            return {
                type: 'annotation',
                kind,
                data,
                children
            };
        },

        marker(kind, data) {
            return {
                type: 'marker',
                kind,
                data
            };
        }
    }
}));
```

A renderer-specific hook factory can then use that context:

```js
function treeAnnotation(kind) {
    return {
        createSpanHooks(factoryContext) {
            return {
                wrap(children, { data }) {
                    return factoryContext.annotation(
                        kind,
                        data,
                        children
                    );
                }
            };
        }
    };
}
```

Use it in a layer:

```js
tree.addLayer(
    diagnosticSpans,
    treeAnnotation('diagnostic')
);
```

The span source remains renderer-independent.

The factory delays creation of the concrete interpretation until it receives exactly the value exposed as `spanHooksContext`. It does not receive the other renderer hooks or the per-invocation span hook context.

This pattern is useful when a renderer provides:

* node constructors;
* escaping;
* style registries;
* identifier allocation;
* state stacks;
* target-specific utilities.

## Keep renderer state per hook resolution

The factory passed to `createRenderPipeline()` should create fresh renderer state each time renderer hooks are resolved. This happens for every `.render()` call and also for explicit introspection through `.spanHooksMap()`.

For example:

```js
const tree = createRenderPipeline(() => {
    let nextNodeId = 1;

    return {
        createBuffer: createTreeBuffer,

        text(value) {
            return {
                id: nextNodeId++,
                type: 'text',
                value
            };
        },

        spanHooksContext: {
            createNode(node) {
                return {
                    id: nextNodeId++,
                    ...node
                };
            }
        }
    };
});
```

Each render begins with its own identifier sequence. Calling `.spanHooksMap()` performs a separate resolution with separate temporary state.

Avoid keeping mutable per-render state outside the renderer factory:

```js
let nextNodeId = 1; // Shared by every render call
```

Shared state can make:

* separate renders affect each other;
* tests order-dependent;
* concurrent use unsafe;
* pipeline reuse surprising.

The pipeline is a reusable view definition. Materialization state should belong to one evaluation.

## Stateful hooks must tolerate segmentation

Suppose the renderer tracks open annotations:

```js
const stack = [];
```

A crossing span may be opened, closed, and later reopened as several segments.

State must follow the actual materialization lifecycle, not assumptions about one call per analytical span.

For this reason, renderer state is usually best managed through:

* the active render stack;
* per-render `spanIndex`;
* explicit segment boundaries;
* span-level open and close behaviour.

Renderer-level `open` and `close` hooks run only at document boundaries with a synthetic document span; they do not track individual span transitions.

Avoid acquiring a resource in the first hook invocation and releasing it in the first close unless the API guarantees those are the complete analytical span boundaries.

For most structured renderers, stateless `wrap()` hooks are simpler and safer than manually tracking open spans.

## Choose whether output should expose segmentation

A custom renderer has two broad options.

### Materialized tree

The result represents the actual valid nested output:

```js
{
    type: 'annotation',
    children: [...]
}
```

Crossing spans may appear as several nodes.

This is appropriate for:

* UI trees;
* HTML-like structures;
* renderer snapshots;
* direct materialization.

### Analytical representation

The result preserves original spans and records segment events separately:

```js
{
    spans: [...],
    segments: [...],
    content: [...]
}
```

This is appropriate for:

* debugging;
* interchange;
* further processing;
* annotation inspection;
* tools that need analytical identity more than a ready-to-display tree.

A normal custom renderer follows the first model.

When the second model is required, rendering may not be the only or best source of data. Pipeline span introspection can provide the original generated spans directly, while a renderer records only their materialized interpretation.

## A complete tree renderer

The pieces can now be combined:

```js
import {
    createRenderPipeline
} from 'hitext';

function appendText(children, value) {
    if (value === '') {
        return;
    }

    const last = children[children.length - 1];

    if (last?.type === 'text') {
        last.value += value;
    } else {
        children.push({
            type: 'text',
            value
        });
    }
}

function createTreeBuffer() {
    const children = [];

    function append(child) {
        if (child == null) {
            return;
        }

        if (Array.isArray(child)) {
            for (const item of child) {
                append(item);
            }

            return;
        }

        if (typeof child === 'string') {
            appendText(children, child);
            return;
        }

        if (child.type === 'text') {
            appendText(children, child.value);
            return;
        }

        children.push(child);
    }

    return {
        append,

        emit() {
            return children;
        }
    };
}

const tree = createRenderPipeline(() => ({
    createBuffer: createTreeBuffer,

    text(value) {
        return {
            type: 'text',
            value
        };
    },

    spanHooksContext: {
        annotation(kind, data, children) {
            return {
                type: 'annotation',
                kind,
                data,
                children
            };
        }
    }
}));

function annotation(kind) {
    return {
        createSpanHooks(factoryContext) {
            return {
                wrap(children, { data }) {
                    return factoryContext.annotation(
                        kind,
                        data,
                        children
                    );
                }
            };
        }
    };
}

const keywordSpans = [{
    start: 0,
    end: 5,
    data: {
        token: 'const'
    }
}];

const view = tree
    .addLayer(
        keywordSpans,
        annotation('keyword')
    )
    .addLayer(
        [{
            start: 6,
            end: 11,
            data: {
                severity: 'error'
            }
        }],
        annotation('diagnostic')
    );

const result = view.render('const value = 42;');
```

The result is equivalent to:

```js
[
    {
        type: 'annotation',
        kind: 'keyword',
        data: {
            token: 'const'
        },
        children: [
            {
                type: 'text',
                value: 'const'
            }
        ]
    },
    {
        type: 'text',
        value: ' '
    },
    {
        type: 'annotation',
        kind: 'diagnostic',
        data: {
            severity: 'error'
        },
        children: [
            {
                type: 'text',
                value: 'value'
            }
        ]
    },
    {
        type: 'text',
        value: ' = 42;'
    }
]
```

The same span sources could also be attached to HTML, TTY, DOM, or JSX interpretations.

Only the materialization layer changed.

## Test the renderer by behaviour

A custom renderer should be tested against the rendering model rather than only one successful example.

### Plain document

```js
tree.render('text');
```

Verify source-text conversion and root result shape.

### Empty document

```js
tree.render('');
```

Decide whether the result is:

```js
[]
```

or another renderer-specific empty representation.

### One wrapped span

Verify:

* text before;
* wrapped content;
* text after;
* span data.

### Nested spans

Verify that nested buffers produce the intended tree.

### Equal spans

Verify deterministic wrapper ordering.

### Crossing spans

Verify:

* valid nesting;
* possible repeated nodes for one span;
* one shared per-render `spanIndex` when exposed.

### Point insertion

Verify that a zero-width replacement adds one node without consuming neighbouring text.

### Replacement

Verify that covered source text is omitted and replaced by the expected node.

### Interruption

When the renderer supports omission or folding helpers, verify that surrounding annotations close and resume correctly.

### Nullish and array results

Verify the buffer’s flattening and omission rules.

### Adjacent text nodes

Verify whether they are preserved or normalized according to the target contract.

## What belongs in the renderer

A renderer should own target-wide policy:

* buffer creation;
* source-text conversion;
* target node construction;
* result normalization;
* renderer state;
* target-specific helper context.

A span hook should own one layer’s interpretation:

* which node type represents a diagnostic;
* how span data maps into node fields;
* what replacement node stands for an omission;
* what marker is inserted at a boundary.

A span source or transformation should own analysis and geometry:

* where diagnostics are;
* which context is visible;
* where markers are anchored;
* which source regions are omitted.

Keeping these responsibilities separate allows each part to evolve independently.

## When not to create a custom renderer

A custom renderer may be unnecessary when the desired result is already naturally expressed by a built-in target.

Use:

* `string()` for plain textual output;
* `html()` for an HTML string;
* `tty()` for terminal formatting;
* `dom()` for DOM nodes;
* `jsx()` for a JSX-compatible tree.

Creating a renderer only to apply one special annotation style usually adds unnecessary complexity. A layer hook on an existing renderer is enough.

Create a custom renderer when the target has its own accumulation and structural rules, not merely different decoration.

## The renderer contract in one view

A custom renderer establishes:

```text
source chunk
    → renderer child value

nested content
    → child buffer result

span interpretation
    → renderer child or result value

root buffer
    → final output
```

The complete flow is:

```text
source document
    + spans
    + layer interpretations
    ↓
render traversal
    ↓
renderer text conversion
    + nested buffers
    + hook results
    ↓
custom output
```

A renderer does not decide what the document means.

It defines the target language in which that meaning is materialized.

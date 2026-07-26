# Extending HiText

HiText is designed to accept domain analysis as range sources and new output formats as renderer buffers. Extend the narrowest layer that owns the behavior: source, transformer, hook utility, or renderer.

## Custom range source

A source analyzes one document and emits ranges:

```js
function rangesForNumbers(document, createRange) {
    for (const match of document.matchAll(/\d+/g)) {
        createRange(
            match.index,
            match.index + match[0].length,
            { value: Number(match[0]) }
        );
    }
}
```

Use it like any built-in source:

```js
const pipeline = html().addLayer(
    rangesForNumbers,
    (content, { data }) =>
        `<var data-value="${data.value}">${content}</var>`
);
```

Keep source output in document coordinates. Use generation context for line boundaries, render options, and prior layer maps rather than closing over per-render mutable state.

## Adapt an external analyzer

Parsers, linters, search indexes, and language services can supply range records directly:

```js
const diagnostics = analyzer.run(document).map(item => ({
    start: item.offset,
    end: item.offset + item.length,
    data: item
}));

pipeline.render(document, { diagnostics });
```

Use `rangesFromOptions('diagnostics')` when results change per call. HiText does not require the analyzer to know about rendering or other annotation providers.

## Custom transformer

A transformer is curried: configuration returns a function from range source to generator. Public `processRanges()` adapts every supported range source form:

```js
import { processRanges } from 'hitext';

function applyClip(from, to) {
    return input => (document, createRange, context) => {
        processRanges(
            document,
            input,
            (start, end, data, origin) => {
                const clippedStart = Math.max(start, from);
                const clippedEnd = Math.min(end, to);

                if (clippedStart <= clippedEnd) {
                    createRange(
                        clippedStart,
                        clippedEnd,
                        data,
                        origin ?? { start, end, data }
                    );
                }
            },
            context
        );
    };
}
```

Decide and document:

- cardinality: one-to-one, one-to-many, or whole-set;
- behavior for empty and point ranges;
- ordering requirements;
- handling of out-of-document offsets;
- whether data is preserved or replaced;
- whether origin is inherited, created, aggregated, or cleared;
- whether stable operation context requires collecting input.

Use `applyMap()` for most one-to-many geometry transformations and `applyDataMap()` for data-only mapping before introducing a new public operator.

## Custom hook utility

A hook utility packages reusable interpretation without owning range generation:

```js
function rangeHooksLink(getUrl) {
    return {
        wrap(content, context) {
            const url = getUrl(context);
            return `<a href="${escapeAttribute(url)}">${content}</a>`;
        }
    };
}
```

Return a partial hooks object for renderer-independent behavior. Return a `RangeHooksFactory` when the utility requires renderer context or state, as the built-in TTY style helpers do.

Remember that crossing ranges may call hooks more than once for one generated range. Key unavoidable state by `rangeIndex` and define when it is released.

## Custom structured renderer

A renderer defines a child type, a buffer result, and optional text or lifecycle hooks. This example builds a JSON-compatible tree:

```js
import { createRenderPipeline } from 'hitext';

function createTreeBuffer() {
    const children = [];

    return {
        append(child) {
            if (Array.isArray(child)) {
                children.push(...child);
            } else if (typeof child === 'string') {
                children.push({ type: 'text', value: child });
            } else if (child != null) {
                children.push(child);
            }
        },
        emit() {
            return children;
        }
    };
}

const tree = createRenderPipeline(() => ({
    createBuffer: createTreeBuffer,
    text: value => ({ type: 'text', value })
}));

const pipeline = tree.addLayer(
    [[6, 11, { kind: 'subject' }]],
    {
        wrap: (children, { data }) => ({
            type: 'annotation',
            kind: data.kind,
            children
        })
    }
);

pipeline.render('Hello world');
// [
//   { type: 'text', value: 'Hello ' },
//   {
//     type: 'annotation',
//     kind: 'subject',
//     children: [{ type: 'text', value: 'world' }]
//   }
// ]
```

The buffer must accept renderer child values, emitted nested results, and strings returned by hooks. Decide whether emitted child arrays should be flattened, nested, or wrapped explicitly.

## Renderer factory context

Stateful renderers can expose helpers to range hook factories:

```js
const renderer = createRenderPipeline(() => {
    const stack = [];

    return {
        createBuffer,
        rangeHooksContext: {
            enter(value) {
                stack.push(value);
            },
            leave() {
                stack.pop();
            }
        }
    };
});
```

A compatible layer definition can then return hooks from `createRangeHooks(context)`. Each `rangeHooksMap()` or `render()` call receives a newly created renderer context.

## Test an extension

Import public APIs from `src/index.ts` or the package root, following the project rule. A source or transformer test should cover:

- empty input and empty document;
- tuple, record, and generator input where applicable;
- points, overlaps, and unsorted ranges;
- data and origin behavior;
- render options and line endings;
- document boundaries.

A renderer or hook utility should cover:

- plain text and empty output;
- nested and crossing ranges;
- repeated segments of one range;
- `wrap` child buffers;
- replacement and `break`;
- zero-width insertion;
- renderer-specific state restoration.

## Document a range function

Public range functions follow this workflow:

```text
implement -> test -> document -> validate
```

Update exports, JSDoc, function tests, the quick-reference matrix, and the detailed reference section together. See [Range Functions Guidelines](range-functions-guidelines.md) for file layout, callback conventions, origin policy, and validation commands.

## Build domain libraries

Higher-level packages can own terminology and policy while delegating interval composition and materialization to HiText. Examples include:

- diagnostic and source excerpt builders;
- diff and code review reports;
- log projection toolkits;
- redaction policies;
- AI context selection and omission rendering;
- structured annotation exporters.

Keep domain analysis independent from renderer hooks when users may need the same ranges as HTML, terminal output, DOM, JSX, or structured data.

# TypeScript

HiText is implemented in TypeScript and exports its public types from the package root.

```ts
import type {
    GenerateRanges,
    PipelineNode,
    RangeHookContext,
    RangeHooks,
    RangeRecord,
    RenderBuffer
} from 'hitext';
```

## Pipeline type parameters

The central type is:

```ts
PipelineNode<RenderOptions, T, R = T, HC = unknown>
```

| Parameter | Meaning |
|---|---|
| `RenderOptions` | Options passed to range generation when calling `ranges()` or `render()` |
| `T` | A child value accepted by the renderer buffer |
| `R` | Result emitted by a buffer and returned by `render()` |
| `HC` | Renderer context available to range hook factories |

Built-in renderer factories carry their output types. `string()`, `tty()`, `dom()`, and `jsx()` accept a render options generic.

## Type range data at the layer

`addLayer<Data>()` types `data` in its hooks:

```ts
import { html } from 'hitext';

type Diagnostic = {
    severity: 'error' | 'warning';
    message: string;
};

const pipeline = html().addLayer<Diagnostic>(
    [{
        start: 0,
        end: 5,
        data: {
            severity: 'error',
            message: 'Unexpected token'
        }
    }],
    {
        wrap: (content, { data }) =>
            `<mark class="${data.severity}" title="${data.message}">` +
            `${content}</mark>`
    }
);
```

The generic describes the layer's range data, not data from every layer in the pipeline. Different layers can use different data types.

## Type render options

Renderer options flow to generators and range operations:

```ts
import { string } from 'hitext';
import type { GenerateRanges } from 'hitext';

type ViewOptions = {
    includeHeader: boolean;
};

const headerRange: GenerateRanges<undefined, ViewOptions> = (
    document,
    createRange,
    { renderOptions }
) => {
    if (renderOptions?.includeHeader) {
        createRange(0, document.indexOf('\n') + 1);
    }
};

const pipeline = string<ViewOptions>().addLayer(
    headerRange,
    content => content.toUpperCase()
);

pipeline.render('title\nbody', { includeHeader: true });
```

The current `html()` factory does not expose a render options generic. For a strongly typed HTML-options pipeline, construct a renderer with `createRenderPipeline<ViewOptions, string>()` and the same escaping text hook, or keep options typing at generator boundaries.

## Type a generator

```ts
import type { GenerateRanges } from 'hitext';

type Token = {
    kind: 'number';
    value: number;
};

const numbers: GenerateRanges<Token, unknown> = (
    document,
    createRange
) => {
    for (const match of document.matchAll(/\d+/g)) {
        createRange(
            match.index,
            match.index + match[0].length,
            { kind: 'number', value: Number(match[0]) }
        );
    }
};
```

`createRange()` accepts `start`, `end`, optional data, and optional origin. The layer marker is supplied by pipeline generation.

## Type reusable hooks

```ts
import type { RangeHooks } from 'hitext';

type Token = { kind: string };

const tokenHooks: Partial<RangeHooks<Token, string>> = {
    open: ({ data }) => `<span class="${data.kind}">`,
    close: () => '</span>'
};
```

For a standalone callback, `RangeHookContext<Data, T, R>` exposes the same data and output types:

```ts
function title({ rangeText }: RangeHookContext<Token, string>) {
    return `${rangeText.length} characters`;
}
```

## Type a transformer

Use `TransformRanges<Data, RenderOptions>` for a curried transformer or `GenerateRanges` for its result:

```ts
import type { TransformRanges } from 'hitext';

const unchanged: TransformRanges<Token, ViewOptions> = input => (
    document,
    createRange,
    context
) => {
    // A custom transformer may process input with the public range helpers.
};
```

Most applications should use built-in transformers, which preserve their documented data and origin behavior. `applyMap()` and `applyDataMap()` are the main extension points for typed custom transformations.

## Type a custom renderer

```ts
import { createRenderPipeline } from 'hitext';
import type { RenderBuffer } from 'hitext';

type Child = string | { kind: string; children: Child[] };
type Result = Child[];

function createBuffer(): RenderBuffer<Child, Result> {
    const children: Child[] = [];

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

const structured = createRenderPipeline<unknown, Child, Result>(() => ({
    createBuffer,
    text: chunk => chunk
}));
```

`T` describes values accepted as individual children. `R` describes the emitted aggregate. A `wrap` hook receives `T | R` and can return a child or aggregate accepted by the parent buffer.

## Previous layer data

`rangesFromLayer<Data>(name)` allows the expected data type to be stated explicitly:

```ts
const derived = rangesFromLayer<Diagnostic>('diagnostics');
```

Layer names are runtime identifiers. TypeScript does not derive a name-to-data map from the immutable layer chain, so the caller is responsible for matching the generic to the named layer.

## Inference boundaries

HiText keeps each layer's data generic local, but a pipeline can contain heterogeneous layers. Introspection methods therefore return broad generated-range and hook-map types. Narrow data at the layer, source, transformer, or hook where its contract is known rather than casting the complete pipeline to one data type.

For exact declarations, see [API Reference](api-reference.md) and the types exported by the installed package.

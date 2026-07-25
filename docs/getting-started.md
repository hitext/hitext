# Getting Started

HiText renders a document through an immutable pipeline of annotation layers. Each layer combines a range source, which identifies parts of the original document, with range hooks, which describe how those parts should be rendered.

## Install

```bash
npm install hitext
```

HiText provides both ESM and CommonJS entry points. The examples in this guide use ESM:

```js
import { html, rangesForMatch } from 'hitext';
```

## Create a pipeline

A renderer creates an empty pipeline. This example uses the HTML renderer:

```js
import { html } from 'hitext';

const pipeline = html();
const result = pipeline.render('One < two');

console.log(result);
// One &lt; two
```

Without layers, a pipeline renders the complete document. The HTML renderer escapes document text; other renderers materialize the same pipeline model as plain strings, terminal output, DOM nodes, or JSX children.

## Add a layer

Use `addLayer(ranges, hooks, name?)` to describe an annotation:

```js
import { html, rangesForMatch } from 'hitext';

const highlight = html().addLayer(
    rangesForMatch('world'),
    content => `<mark>${content}</mark>`
);

console.log(highlight.render('Hello world! Hello world!'));
// Hello <mark>world</mark>! Hello <mark>world</mark>!
```

`rangesForMatch('world')` finds ranges in the original document. The function passed as the second argument is shorthand for a `wrap` hook. It receives the content rendered for each range and returns its replacement in the renderer's output type.

`addLayer()` does not mutate the existing pipeline. It returns a new pipeline with the additional layer:

```js
const base = html();
const highlighted = base.addLayer(
    [[0, 5]],
    content => `<strong>${content}</strong>`
);

base.render('Hello world');
// Hello world

highlighted.render('Hello world');
// <strong>Hello</strong> world
```

## Combine independent annotations

Layers always use offsets in the same source document, so they do not need to know about markup produced by other layers:

```js
const pipeline = html()
    .addLayer(
        rangesForMatch(/const|return/g),
        content => `<span class="keyword">${content}</span>`
    )
    .addLayer(
        rangesForMatch('answer'),
        content => `<mark>${content}</mark>`
    );

pipeline.render('const answer = () => return 42');
// <span class="keyword">const</span> <mark>answer</mark> = () => <span class="keyword">return</span> 42
```

The same principle applies when ranges overlap. HiText resolves intersections during rendering and produces correctly nested output for the selected renderer.

## Use range data

Ranges can carry arbitrary data. Hooks receive it through their context:

```js
const pipeline = html().addLayer(
    [{
        start: 0,
        end: 5,
        data: { kind: 'greeting' }
    }],
    {
        open: ({ data }) => `<span class="${data.kind}">`,
        close: () => '</span>'
    }
);

pipeline.render('Hello world');
// <span class="greeting">Hello</span> world
```

Range offsets are zero-based and `end` is exclusive, matching `String.prototype.slice()`.

## Name and derive layers

A named layer can be used as the source for a later layer. This turns a pipeline into an ordered dataflow rather than a flat list of decorations:

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
        rangesForMatch('ERROR'),
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
```

Here the second layer takes the generated ranges from `matches`, expands them by one surrounding line, inverts the selection, and replaces omitted regions. The match layer still renders normally inside the retained excerpts.

Layer dependencies are evaluated in order. A layer can reference only a named layer added before it.

## Use render options

Render options are supplied when a document is processed. Range generators, transformers, predicates, and hooks can use them to produce different views with one pipeline:

```js
const pipeline = html().addLayer(
    (document, createRange, { renderOptions }) => {
        if (renderOptions?.highlight) {
            createRange(0, document.length);
        }
    },
    content => `<mark>${content}</mark>`
);

pipeline.render('Hello', { highlight: false });
// Hello

pipeline.render('Hello', { highlight: true });
// <mark>Hello</mark>
```

TypeScript users can specify the render options type when creating a custom pipeline or renderer. See [TypeScript](typescript.md) for the generic types involved.

## Inspect a pipeline

A pipeline exposes its intermediate products:

```js
pipeline.ranges(document, options);
pipeline.rangeHooksDefinitionMap();
pipeline.rangeHooksMap();
```

- `ranges()` generates and normalizes all layer ranges.
- `rangeHooksDefinitionMap()` returns the hook definitions attached to layer markers.
- `rangeHooksMap()` resolves those definitions for the pipeline's renderer.

These methods are useful for tests, debugging, and tooling. `render()` performs the complete generation, hook resolution, and rendering flow.

## Next steps

- [Core Concepts](core-concepts.md) explains ranges, layers, segments, hooks, buffers, and projections.
- [Range Functions Reference](range-functions-reference.md) documents the built-in sources and transformers.
- [Range Hooks](range-hooks.md) covers rendering behavior and hook context.
- [Renderers](renderers.md) compares the built-in output formats.
- [Projections and Excerpts](projections-and-excerpts.md) shows how to hide, replace, and retain annotated source regions.

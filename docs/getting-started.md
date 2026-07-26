# Getting Started

This tutorial builds an HTML excerpt that combines independent keyword and search annotations, then keeps only the line containing the search result.

The final output will be:

```html
...
<span class="keyword">const</span> <mark>y</mark> = 2;
...
```

## Before you start

HiText 2.0 is not published yet. The unqualified npm package currently exposes the legacy `1.0.0-beta.1` API. The examples below target the current repository branch.

Once a 2.0 prerelease or stable version is published, install it with:

```bash
npm install hitext
```

The examples use ESM imports. HiText also provides a CommonJS entry point.

## 1. Create an HTML pipeline

A renderer creates an empty pipeline:

```js
import { html } from 'hitext';

const pipeline = html();
```

Without layers, the pipeline renders the complete document and escapes it for HTML:

```js
pipeline.render('One < two');
// One &lt; two
```

## 2. Add independent annotations

Start with this document:

```js
const document = [
    'const x = 1;',
    'const y = 2;',
    'const z = 3;'
].join('\n');
```

Add one layer for keywords and another for the search result:

```js
import { html, rangesForMatch } from 'hitext';

const annotated = html()
    .addLayer(
        rangesForMatch(/const/g),
        content => `<span class="keyword">${content}</span>`
    )
    .addLayer(
        rangesForMatch(/y/g),
        content => `<mark>${content}</mark>`,
        'search'
    );
```

Each `rangesForMatch()` call reads the original document. The layers do not see or parse markup produced by each other.

The function passed as the second argument is shorthand for a `wrap` hook: it receives the content rendered for a range and returns its representation in the current renderer.

Render the complete document:

```js
annotated.render(document);
// <span class="keyword">const</span> x = 1;
// <span class="keyword">const</span> <mark>y</mark> = 2;
// <span class="keyword">const</span> z = 3;
```

## 3. Derive an excerpt from the search layer

The search layer has the name `search`. A later layer can reuse its generated ranges without running the search again.

Build omitted regions in three steps:

```text
search match
    -> expand to its complete line
    -> invert the visible line into omitted regions
```

```js
import {
    applyExpandTo,
    applyInvert,
    rangesCompose,
    rangesFromLayer
} from 'hitext';

const excerpt = annotated.addLayer(
    rangesCompose(
        rangesFromLayer('search'),
        applyExpandTo('line'),
        applyInvert()
    ),
    { replace: () => '...\n' }
);
```

Render the same document:

```js
excerpt.render(document);
// ...
// <span class="keyword">const</span> <mark>y</mark> = 2;
// ...
```

The last layer replaces omitted source regions during the same traversal that renders the keyword and search annotations. It never cuts completed HTML, and the surviving annotations keep their original offsets.

## 4. Reuse the pipeline

`addLayer()` returns a new pipeline instead of changing its receiver. The `annotated` pipeline still renders the full document, while `excerpt` renders the reduced view.

Both pipelines can process other documents because their range sources derive offsets for each input:

```js
excerpt.render([
    'const before = 1;',
    'const y = 2;',
    'const after = 3;'
].join('\n'));
```

Static range arrays are different: the application must ensure that their offsets belong to the document being rendered.

## What you used

- A renderer selected the output format.
- Each layer combined a range source with rendering behavior.
- Independent layers shared one document coordinate space.
- A named layer supplied generated ranges to a later transformation.
- Replacement created an excerpt without post-processing markup.
- Immutable pipelines allowed the full and reduced views to coexist.

## Next steps

- [Core Concepts](core-concepts.md) defines ranges, layers, intersections, hooks, and output buffers.
- [Range Functions Guide](range-functions-guide.md) explains sources, transformations, data, and origin.
- [Rendering](rendering.md) covers crossings, hook lifecycle, replacement, and insertion.
- [Renderers](renderers.md) compares HTML, strings, TTY, DOM, JSX, and custom output.
- [Recipes](recipes.md) develops diagnostics, diffs, logs, redaction, and generated document sections.

<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)

HiText is a range-based text transformation and rendering engine. It combines independent annotations over one source document, resolves their intersections, and materializes the result as a string, HTML, terminal output, DOM, JSX, or a custom output type.

```text
Document text
    -> Layers (ranges + hooks)
    -> Render pipeline
    -> String / HTML / TTY / DOM / JSX / custom output
```

Annotations always use offsets in the original document. A syntax highlighter, search matcher, diagnostic provider, and excerpt builder can therefore be composed without parsing each other's markup or translating positions after every transformation.

## Install

```bash
npm install hitext
```

## Quick start

```js
import { html, rangesForMatch } from 'hitext';

const highlight = html().addLayer(
    rangesForMatch('world'),
    content => `<mark>${content}</mark>`
);

highlight.render('Hello world! Hello world!');
// Hello <mark>world</mark>! Hello <mark>world</mark>!
```

A layer combines a range source with rendering hooks. `addLayer()` returns a new immutable pipeline, and `render()` can reuse that pipeline for any document.

## Compose derived views

Ranges are not limited to decoration. A later layer can derive ranges from earlier layers and use them to select, hide, replace, or insert content while preserving the annotations that remain visible.

```js
import {
    applyExpandTo,
    applyInvert,
    html,
    rangesCompose,
    rangesForMatch,
    rangesFromLayer
} from 'hitext';

const searchExcerpt = html()
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

This pipeline finds matches, expands them to one line of context, inverts the visible regions, and replaces omissions with an ellipsis. Match highlighting is rendered normally inside the retained excerpts.

## Built-in renderers

- `string()` produces unescaped strings.
- `html()` produces strings and escapes source text for HTML.
- `tty()` produces ANSI-colored terminal strings.
- `dom()` produces a `DocumentFragment`.
- `jsx()` produces an array of JSX-compatible children.
- `createRenderPipeline()` builds a renderer for another output type.

HiText has no runtime dependencies.

## Documentation

- [Documentation overview](docs/README.md)
- [Getting Started](docs/getting-started.md)
- [Core Concepts](docs/core-concepts.md)
- [Range Functions Reference](docs/range-functions-reference.md)
- [API Reference](docs/api-reference.md)
- [Recipes](docs/recipes.md)
- [Migration from HiText 1.x](docs/migration-from-1.x.md)

## Status

The current branch is the development line for HiText 2.0. It is a redesign of the public API around explicit range sources, transformations, immutable layers, renderer-independent hooks, and typed pipeline products.

## License

MIT

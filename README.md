<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)

**Build rich text views from independent annotations without rewriting offsets or cutting rendered markup.**

Rich text output rarely comes from one operation. Syntax highlighting, search matches, diagnostics, line numbers, folds, and excerpt selection may all come from different tools, but they refer to positions in the same source text.

Applying those operations one after another creates a painful choice:

- Cut the source first, and every remaining annotation needs new coordinates.
- Render first, and later operations must cut through HTML, DOM, JSX, or terminal escape sequences without breaking their structure.

The problem becomes harder when annotations overlap or when a result keeps only several disconnected parts of the document.

HiText keeps every annotation anchored to the original text and resolves them together when producing the result. Independent layers do not parse each other's output, and annotations remain correctly placed when unrelated content is omitted or replaced.

> **Release status:** HiText 2.0 is currently in development and has not been published. The examples below describe the API in this repository. The unqualified `hitext` package on npm currently provides the legacy `1.0.0-beta.1` API.

## Quick start

A layer identifies parts of the source text and defines how they appear in the result:

```js
import { html, rangesForMatch } from 'hitext';

const highlight = html().addLayer(
    rangesForMatch('world'),
    content => `<mark>${content}</mark>`
);

highlight.render('Hello world!');
// Hello <mark>world</mark>!
```

Highlighting one match is easy. The advantage of HiText appears when several independent operations must remain correct in a derived view.

## Where composition matters

Suppose keyword highlighting is produced independently from a search result, and the final view should contain only the line with that result:

```js
import {
    applyExpandTo,
    applyInvert,
    html,
    rangesCompose,
    rangesForMatch,
    rangesFromLayer
} from 'hitext';

const document = [
    'const x = 1;',
    'const y = 2;',
    'const z = 3;'
].join('\n');

const excerpt = html()
    .addLayer(
        rangesForMatch(/const/g),
        content => `<span class="keyword">${content}</span>`
    )
    .addLayer(
        rangesForMatch(/y/g),
        content => `<mark>${content}</mark>`,
        'search'
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('search'),
            applyExpandTo('line'),
            applyInvert()
        ),
        { replace: () => '...\n' }
    );

excerpt.render(document);
```

Output:

```html
...
<span class="keyword">const</span> <mark>y</mark> = 2;
...
```

All three layers use positions in the original document. The keyword layer does not know about the search layer, and neither one knows which lines the final view will retain. The last layer derives the visible line from the search result and replaces everything else; it never cuts completed HTML.

The same model can build search excerpts, diagnostic views, folded code, diff context, redacted output, and generated document sections while keeping surviving annotations attached to their source text.

## What HiText provides

- Independent range sources and overlapping annotations.
- Range transformations for filtering, expansion, merging, inversion, insertion points, and derived data.
- Named layers whose generated ranges can feed later layers.
- Replacement and insertion during the same traversal as annotation rendering.
- Pipelines for strings, escaped HTML, terminal output, DOM, and JSX.
- Custom output through a small buffer interface.
- Inspection of generated ranges and resolved hooks for tests and tooling.

HiText has no runtime dependencies. The current complete ESM bundle is 15,214 bytes minified and 5,857 bytes after gzip, measured from `npm run build` output.

## Scope

HiText renders immutable document snapshots. It is not an editor, parser, or syntax highlighter, although those tools can produce ranges for it.

HiText 2.0 does not provide incremental updates after edits, streaming output, or a built-in relevance and budget optimizer. Applications own document updates and selection policy.

## Documentation

- [Getting Started](docs/getting-started.md) — build one useful pipeline in about ten minutes.
- [Core Concepts](docs/core-concepts.md) — understand ranges, layers, intersections, and output.
- [Range Functions Guide](docs/range-functions-guide.md) — compose selections and derived ranges.
- [Rendering](docs/rendering.md) — hooks, crossings, replacement, and insertion.
- [Recipes](docs/recipes.md) — excerpts, diagnostics, diffs, logs, and generated content.
- [API Reference](docs/api-reference.md) — package exports and exact contracts.
- [Upgrade to HiText 2.0](docs/upgrade-to-2.0.md) — breaking changes and verified migration examples.

See the [documentation overview](docs/README.md) for the complete public set.

## Related projects

- **HiMatch** is a separate matching project that can produce structured ranges for HiText. HiText does not depend on it.
- **Discovery.js** is an established consumer of the HiText 1.x beta API and a real-world migration target for 2.0.

Possible future package boundaries such as HiRange and HiRender are design directions, not release commitments.

## License

MIT

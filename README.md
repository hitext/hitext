<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)
[![Coverage Status](https://coveralls.io/repos/github/hitext/hitext/badge.svg?branch=master)](https://coveralls.io/github/hitext/hitext?branch=master)

**Compose independent text annotations into one deterministic, well-formed output.**

HiText lets syntax tokens, search matches, diagnostics, selections, line structure, and generated content all describe the same immutable source document. Each producer emits spans in source coordinates; HiText resolves overlaps only when rendering to HTML, strings, terminals, DOM, JSX, or a custom target.

```text
document + independent spans + layer interpretations → output
```

No decorator rewrites another decorator's input. No offsets need to be translated after markup is inserted. Crossing annotations remain independent data while HiText materializes them as valid nested output.

## Install

```bash
npm install hitext
```

HiText has no runtime dependencies, includes TypeScript definitions, supports ESM and CommonJS, and requires Node.js 14.14 or newer.

## Quick Start

```js
import {
    applyFitToWindow,
    applyInvert,
    applyMerge,
    html,
    spanHooksHide,
    spansCompose,
    spansFromLayer,
    spansFromMatch
} from 'hitext';

const searchResults = html()
    .addLayer(
        spansFromMatch(/timeout/gi),
        content => `<mark>${content}</mark>`,
        'matches'
    )
    .addLayer(
        spansCompose(
            spansFromLayer('matches'),
            applyFitToWindow(42),
            applyMerge(),
            applyInvert()
        ),
        spanHooksHide({ ellipsis: '...' })
    );

const log = 'Connecting to primary database failed: timeout after 30 seconds; retrying with replica.';

searchResults.render(log);
// ...database failed: <mark>timeout</mark> after 30 seconds;...
```

The match remains an annotation over the original log. Later analytical layers derive a 42-character viewport and its omitted complement; only materialization turns that model into a compact result.

See the [example gallery](docs/examples.md) for progressive detail, redaction, generated tables of contents, terminal styling, and more complete variations of this pattern.

## What It Supports

- Independent, overlapping spans with deterministic layer ordering
- Static spans, pattern matching, line-derived spans, parser output, and per-render application data
- Composable transformations for filtering, mapping, merging, expansion, inversion, and projection
- Wrapping, source replacement, omission, and point insertion
- Reusable immutable pipelines and named analytical layers
- Built-in `string`, `html`, `tty`, `dom`, and `jsx` renderers
- Custom renderers for trees, event streams, JSON-compatible values, and application-specific output

HiText is not a syntax highlighter or parser. It is the composition and rendering layer that lets those tools coexist with every other annotation over the same text.

## Documentation

Start with the [documentation overview](docs/README.md), or go directly to:

- [Introduction and mental model](docs/1-intro.md)
- [Building a diagnostic view](docs/2-building-a-diagnostics-view.md), a complete tutorial
- [Thinking in spans](docs/3-thinking-in-spans.md), for composition and projection patterns
- [Practical examples](docs/examples.md), from focused search to generated summaries
- [Span sources and transformations](docs/4-span-sources-and-transformations.md)
- [Layers and materialization](docs/5-layers-and-materialization.md)
- [Rendering overlapping spans](docs/6-rendering-overlapping-spans.md)
- [Span functions reference](docs/span-functions-reference.md)
- [Pipeline and rendering reference](docs/pipeline-and-rendering-reference.md)
- [Creating a custom renderer](docs/create-custom-renderer.md)

## License

[MIT](LICENSE)

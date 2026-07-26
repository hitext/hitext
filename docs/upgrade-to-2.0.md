# Upgrade to HiText 2.0

HiText 2.0 is a complete redesign of the published 1.x beta API. It preserves the original goal — composing independent annotations over one document — but changes the public model from decorators and printer chains to explicit range sources, layers, hooks, and renderer pipelines.

> **Release status:** HiText 2.0 is not published yet. The npm package still exposes `1.0.0-beta.1`; this page describes the current development branch.

## Why the API changed

The 1.x API combined several responsibilities in decorator and printer objects:

- finding ranges;
- selecting a printer type;
- defining printer hooks;
- extending a mutable-looking fluent chain;
- applying the configured pipeline as a function.

That model worked dynamically, but TypeScript had no clear way to describe the data flowing between decorators, transformations, and output targets. It also provided no direct model for deriving ranges from earlier pipeline results.

HiText 2.0 makes those responsibilities explicit:

```text
range sources and transformations
    -> ordered layers
    -> range hook definitions
    -> renderer output
```

This is an architectural migration, not a list of renamed methods.

## Main changes

| HiText 1.x beta | HiText 2.0 |
|---|---|
| Decorator object | Range source and range hooks in a layer |
| `.use()` chain | Immutable `.addLayer()` chain |
| Printer type and printer set | Renderer pipeline and range hook definitions |
| Callable configured pipeline | `.render(document, options?)` |
| Generator-specific type assignment | Layer marker assigned by the pipeline |
| Ad hoc cross-decorator logic | Named layers and range transformations |
| Primarily string-oriented printers | String, HTML, TTY, DOM, JSX, or custom buffers |

## Basic decoration

HiText 1.x selected HTML behavior through a decorator printer object:

```js
const hitext = require('hitext');

const matchPrinter = {
    html: {
        open: () => '<span class="match">',
        close: () => '</span>'
    }
};

const output = hitext()
    .use(hitext.gen.matches('world'), matchPrinter)
    .print('Hello world!', 'html');
```

HiText 2.0 starts with the renderer and binds the range source and hooks in a layer:

```js
import { html, rangesForMatch } from 'hitext';

const output = html()
    .addLayer(
        rangesForMatch('world'),
        content => `<span class="match">${content}</span>`
    )
    .render('Hello world!');
```

## Reusable pipelines

A 1.x preset used `.use()` and `.printer()`:

```js
const preset = hitext
    .use(tokenDecorator)
    .use(spotlightRanges, spotlightPrinter)
    .printer('html');

const output = preset(document);
```

In 2.0, `addLayer()` returns a new pipeline. Configured prefixes can be reused without mutation:

```js
const base = html().addLayer(tokenRanges, tokenHooks, 'tokens');
const withSpotlight = base.addLayer(spotlightRanges, spotlightHooks);

const plainTokens = base.render(document);
const spotlighted = withSpotlight.render(document);
```

## Range generators

The 2.0 generator contract is:

```js
function ranges(document, createRange, context) {
    createRange(start, end, data, origin);
}
```

`createRange()` no longer receives an annotation type. The current layer assigns its marker.

Use generation context for render options, line helpers, and earlier layer maps. Prefer built-in sources when they express the operation directly:

```js
rangesForMatch(pattern)
rangesForLines(type)
rangesFrom(input)
rangesFromOptions(keyOrCallback)
```

## Printer hooks and renderer extensions

The 1.x TTY printer received helpers through a printer factory:

```js
hitext
    .use(ranges, {
        tty: ({ createStyle }) => createStyle('bgWhite', 'red')
    })
    .printer('tty');
```

In 2.0, renderer-specific range hook factories are explicit definitions:

```js
import { tty } from 'hitext';

const pipeline = tty().addLayer(
    ranges,
    tty.createStyle('bgWhite', 'red')
);
```

Ordinary `open`, `close`, `wrap`, `text`, and `replace` hooks are documented in [Rendering](rendering.md).

## Derived ranges and excerpts

The 1.x API had no direct equivalent of named generated-range dependencies and curried transformations. In 2.0, one layer can derive geometry from a previous named layer:

```js
const excerpts = html()
    .addLayer(matches, matchHooks, 'matches')
    .addLayer(
        rangesCompose(
            rangesFromLayer('matches'),
            applyExpandTo('line', 1),
            applyInvert()
        ),
        rangeHooksHide()
    );
```

This is a new composition pattern, not a renamed 1.x method. The match analysis runs once, and its generated ranges can feed highlighting, context selection, insertion points, or summaries.

## TypeScript model

HiText 2.0 gives explicit TypeScript types to concepts that were implicit in 1.x:

- range values and generators;
- render options;
- transformer callbacks;
- layer-local data;
- hook context;
- renderer child and result types;
- buffers and range hook factories.

Not every runtime relationship is inferred. Named layer lookup is string-based, and `rangesCompose()` currently retains the initial source data type in its declared result. Exact limitations and workarounds remain in the supporting [TypeScript notes](typescript.md).

## Removed assumptions

Do not carry these 1.x assumptions into migrated code:

- A pipeline is not a mutable registry of decorators.
- A configured pipeline is not invoked as a function.
- Range type is not supplied to `createRange()`.
- Output behavior is not selected from a global printer set.
- One generated range does not necessarily produce one hook call; crossings create segments.
- Hook output is not necessarily a string.

## Upgrade checklist

1. Pin the existing 1.x beta while migration is in progress.
2. Choose a 2.0 renderer for each output path.
3. Split every decorator into a range source and range hook definition.
4. Replace `.use()` chains with `addLayer()` and keep the returned pipeline.
5. Replace callable pipelines or `.print()` with `.render()`.
6. Replace printer sets with ordinary hooks or renderer-specific range hook factories.
7. Move cross-decorator analysis to named layers and range transformers.
8. Test generated geometry with `pipeline.ranges()` separately from final output.
9. Add crossing, replacement, and zero-width cases where 1.x assumed one lifecycle per range.

## Validation before release

The examples above were checked against the historical beta README and the legacy Discovery.js integration. Before publishing 2.0, migration should also be exercised on a real consumer and the final package version, changelog, Node support, and installation command must be updated.

Start the new API with [Getting Started](getting-started.md), then use [Core Concepts](core-concepts.md) and [Range Functions Guide](range-functions-guide.md) for the model behind the migration.

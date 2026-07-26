# Migration from HiText 1.x

HiText 2.0 is a complete redesign. It preserves the original goal of composing independent text annotations, but it does not provide a syntax-compatible continuation of the 1.x chain and printer API.

Migration is best approached by identifying range generation, rendering behavior, and reusable configuration separately, then expressing them as layers in a new immutable pipeline.

## Conceptual changes

| HiText 1.x | HiText 2.0 |
|---|---|
| Decorator object | Range source plus range hooks in a layer |
| `.use()` chain | Immutable `.addLayer()` chain |
| Printer type and printer set | Renderer pipeline and renderer-specific hook factories |
| Decorator printer configuration | Explicit range hooks |
| Pipeline used as a decorate function | `.render(document, options?)` |
| Generated ranges inspected through legacy pipeline methods | `.ranges()`, `.rangeHooksDefinitionMap()`, and `.rangeHooksMap()` |
| Dynamic factory composition | Typed sources, transformers, layers, hooks, and buffers |

The change is architectural, not a table of method renames.

The 1.x snippets below are based on the published beta README and the legacy integration still used by Discovery.js.

## Before and after: basic decoration

HiText 1.x selected printer behavior through a decorator-specific printer object:

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

HiText 2.0 starts with the renderer and binds the source and range hooks in a layer:

```js
import { html, rangesForMatch } from 'hitext';

const output = html()
    .addLayer(
        rangesForMatch('world'),
        content => `<span class="match">${content}</span>`
    )
    .render('Hello world!');
```

## Before and after: reusable pipelines

In 1.x, `.use()` and `.printer()` assembled a preset:

```js
const preset = hitext
    .use(tokenDecorator)
    .use(spotlightRanges, spotlightPrinter)
    .printer('html');

const output = preset(document);
```

In 2.0, immutable pipeline prefixes provide reuse:

```js
const base = html().addLayer(tokenRanges, tokenHooks, 'tokens');
const withSpotlight = base.addLayer(spotlightRanges, spotlightHooks);

const plainTokens = base.render(document);
const spotlighted = withSpotlight.render(document);
```

## Before and after: renderer extensions

The 1.x TTY printer received helpers through a printer factory:

```js
hitext
    .use(ranges, {
        tty: ({ createStyle }) => createStyle('bgWhite', 'red')
    })
    .printer('tty');
```

In 2.0, renderer-specific range hook factories are explicit public definitions:

```js
import { tty } from 'hitext';

const pipeline = tty().addLayer(
    ranges,
    tty.createStyle('bgWhite', 'red')
);
```

## Before and after: derived excerpts

1.x decorators could share a document, but the API had no direct equivalent of named generated-range dependencies and curried range transformations. Excerpt selection usually had to be computed outside the pipeline.

In 2.0, the dependency is part of the pipeline:

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

This is a new composition pattern, not a renamed 1.x method.

## Create the renderer first

The 1.x API selected a printer while constructing `hitext(...)`. In 2.0, a renderer creates the pipeline:

```js
import { html } from 'hitext';

const pipeline = html();
```

Built-in renderer factories are `string`, `html`, `tty`, `dom`, and `jsx`. Use `createRenderPipeline()` for another output type.

## Replace decorators with layers

A 1.x decorator combined a name, ranges, and printer setup. In 2.0, pass those parts directly to `addLayer()`:

```js
const pipeline = html().addLayer(
    ranges,
    rangeHooks,
    'layer-name'
);
```

The range source can be static input, a generator, a built-in source, or a composition of transformers. The hooks can be a `wrap` shortcut, a partial hooks object, or a renderer-specific range hook factory.

This separation is intentional: the same range source can be transformed or reused without packaging it into a decorator object.

## Replace `.use()` with `addLayer()`

In the 1.0 beta API, `.use()` built a chain of decorators. In 2.0, each `addLayer()` returns a new pipeline:

```js
const base = html();
const highlighted = base.addLayer(tokens, tokenHooks, 'tokens');
const complete = highlighted.addLayer(diagnostics, diagnosticHooks);
```

Keep the returned value. Calling `base.addLayer(...)` does not modify `base`.

## Replace decorate calls with `render()`

The 1.0 beta pipeline could be invoked as a decorate function. In 2.0, rendering is explicit:

```js
const output = pipeline.render(document, renderOptions);
```

This makes the pipeline products distinct: range generation, hook resolution, and output materialization each have an observable API.

## Convert range generators

The 2.0 generator contract is:

```js
function ranges(document, createRange, context) {
    createRange(start, end, data, origin);
}
```

`createRange()` does not receive an annotation type. The pipeline assigns the current layer marker. Access render options through `context.renderOptions`, previous layer ranges through `context.rangesByName` or `rangesFromLayer()`, and line helpers through `context.lines`.

Prefer built-in sources when they express the operation directly:

```js
rangesForMatch(pattern)
rangesForLines(type)
rangesFrom(input)
rangesFromOptions(keyOrCallback)
```

## Convert printer methods to hooks

The old `open` and `close` printer behavior maps to range hooks of the same names, but 2.0 adds explicit segment and buffer semantics:

```js
{
    open: context => '<span>',
    close: context => '</span>'
}
```

For a container around rendered child content, prefer `wrap`:

```js
content => `<span>${content}</span>`
```

Use `text` to transform document chunks and `replace` to consume a source interval and emit synthetic output. Hooks receive `context.document`; the current segment is `context.start/end`, while the complete annotation is `context.range.start/end`.

## Convert printer extensions

1.x printer sets and `createHook` extensions have no direct compatibility layer. In 2.0, renderer-specific behavior belongs in a `RangeHooksFactory`:

```js
{
    createRangeHooks(rendererContext) {
        return {
            open() {
                rendererContext.enter();
            },
            close() {
                rendererContext.leave();
            }
        };
    }
}
```

The built-in TTY helpers demonstrate this pattern through `tty.createStyle()` and `tty.createStyleMap()`.

## Replace ad hoc derived decorators

2.0 treats generated ranges as composable data. Use named layers and transformers instead of rebuilding source analysis inside another decorator:

```js
const pipeline = html()
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

This establishes an ordered dependency: the second layer derives its geometry from the normalized output of `matches`.

## Migrate tests

Test through the package's public entry point. Separate geometry assertions from output assertions:

```js
const ranges = pipeline.ranges(document, options);
const output = pipeline.render(document, options);
```

For crossing annotations, test segment-sensitive hooks as well as final output. For custom renderers, cover nested ranges, replacements, zero-width insertions, and empty documents.

## Removed assumptions

Do not carry these 1.x assumptions into migrated code:

- A pipeline is not a mutable registry of decorators.
- A configured pipeline is not invoked as a function.
- Range type is not supplied to `createRange()`.
- Rendering behavior is not selected from a global printer set.
- One range does not necessarily produce one hook call; crossings create segments.
- Hook output is not necessarily a string.

## Upgrade checklist

1. Pin the existing 1.x beta while migration is in progress.
2. Choose the 2.0 renderer factory for each output path.
3. Split every decorator into a range source and range hook definition.
4. Replace `.use()` chains with immutable `addLayer()` calls and keep returned pipelines.
5. Replace callable pipelines or `.print()` with `.render()`.
6. Replace printer sets with ordinary hooks or renderer-specific range hook factories.
7. Move cross-decorator analysis to named layers and range transformers.
8. Test generated geometry with `pipeline.ranges()` separately from output.
9. Add crossing, replacement, and zero-width cases where the old pipeline assumed one hook call per range.
10. Review [HiText 2.0 Release Notes](release-notes-2.0.md) for compatibility and release status.

Start with [Getting Started](getting-started.md), then use [Core Concepts](core-concepts.md) for the new computation model and [Range Functions Reference](range-functions-reference.md) for direct replacements of common range-generation logic.

# Renderers

A renderer defines how the common HiText traversal materializes output. It supplies a buffer implementation and may provide renderer-level hooks for text conversion or lifecycle state.

All built-in renderers create an immutable pipeline:

```js
const pipeline = html().addLayer(ranges, hooks);
const output = pipeline.render(document);
```

Range generation, ordering, segmentation, replacement, and hook context are renderer-independent. Buffer values and text handling are renderer-specific.

## Comparison

| Renderer | Result | Source text handling | Environment |
|---|---|---|---|
| `string()` | `string` | Unchanged | Any |
| `html()` | `string` | Escapes `&`, `<`, and `>` | Any |
| `tty()` | `string` | Adds ANSI color transitions | Terminal |
| `dom()` | `DocumentFragment` | Creates text nodes | DOM |
| `jsx()` | JSX-compatible child array | Preserves string children | JSX runtime supplied by caller |

## String

`string<RenderOptions>()` produces unescaped strings:

```js
import { string } from 'hitext';

const markdown = string()
    .addLayer([[0, 5]], content => `**${content}**`)
    .render('Hello world');

// **Hello** world
```

Use it for plain-text transformations and textual formats where hook output should be concatenated directly.

## HTML

`html()` produces an HTML string. Document chunks are escaped, while values returned by range hooks are treated as output and are not escaped:

```js
import { html } from 'hitext';

const output = html()
    .addLayer([[0, 5]], content => `<mark>${content}</mark>`)
    .render('<tag>');

// <mark>&lt;tag&gt;</mark>
```

Do not interpolate untrusted range data into hook markup without escaping or validating it. Automatic escaping applies to source text, not to hook output.

## TTY

`tty<RenderOptions>()` produces a string with ANSI foreground and background colors. Its helpers create renderer-specific range hook factories:

```js
import { rangesForMatch, tty } from 'hitext';

const output = tty()
    .addLayer(
        rangesForMatch(/error|warning/g),
        tty.createStyleMap({
            error: ['red', 'bgWhite'],
            warning: ['yellow', 'bgBlack']
        })
    )
    .render('error & warning');
```

`tty.createStyle(...styles)` applies one foreground color and/or one background color. Names include the standard and bright ANSI colors, such as `red`, `cyanBright`, `bgBlue`, and `bgYellowBright`. `reset` restores default foreground and background colors.

`tty.createStyleMap(map, fetcher?)` selects styles by range data. When data is absent, the default key is `rangeText`:

```js
tty.createStyleMap(
    {
        high: 'red',
        low: 'green'
    },
    ({ data }) => data.priority
)
```

The renderer maintains a style stack. Nested and crossing annotations restore the previous foreground and background state instead of emitting an unconditional full reset at every boundary.

## DOM

`dom<RenderOptions>(options?)` returns a `DocumentFragment`. Pass a document implementation explicitly outside a browser:

```js
import { dom } from 'hitext';

const pipeline = dom({ document }).addLayer(
    [[6, 11]],
    {
        wrap: content => {
            const element = document.createElement('strong');
            element.append(content);
            return element;
        }
    }
);

const fragment = pipeline.render('Hello world!');
```

Without `options.document`, the DOM buffer uses `globalThis.document`. Source text is appended as text nodes by the buffer. A `wrap` hook receives the segment's child `DocumentFragment` and can return a node or fragment.

## JSX

`jsx<RenderOptions>()` returns an array of JSX-compatible children. HiText does not create elements or depend on a JSX framework; hooks return elements created by the caller's runtime:

```jsx
import { jsx } from 'hitext';

const children = jsx()
    .addLayer(
        [[0, 5]],
        content => <strong>{content}</strong>
    )
    .render('Hello world');

function Message() {
    return <p>{children}</p>;
}
```

The built-in child type admits element-like objects and primitive JSX child values. Compatibility with a particular framework depends on the elements returned by your hooks and that framework's child conventions.

## Custom renderers

`createRenderPipeline(createRenderHooks)` is the renderer construction primitive:

```ts
import { createRenderPipeline } from 'hitext';

const renderer = createRenderPipeline(() => ({
    createBuffer,
    text: documentChunk => convertText(documentChunk),
    open: context => onDocumentOpen(context),
    close: context => onDocumentClose(context),
    rangeHooksContext
}));
```

Only `createBuffer` is needed when the default string behavior is unsuitable. A buffer implements:

```ts
interface RenderBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}
```

Renderer hooks have these responsibilities:

- `createBuffer()` creates root and nested buffers.
- `text(chunk, context)` converts document text to the renderer's child type.
- `open(context)` and `close(context)` emit at the start and end of the complete render.
- `rangeHooksContext` exposes renderer-specific helpers to range hook factories.

Custom renderer tests should cover plain text, nested ranges, crossing ranges, `wrap`, replacement, zero-width insertion, and empty output. Those cases exercise the shared traversal and the buffer's parent/child behavior.

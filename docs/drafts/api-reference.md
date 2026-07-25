# API Reference

Complete API reference for HiText, including renderers, pipeline methods, range functions, hooks, and low-level APIs.

## Table of Contents

- [Renderers](#renderers)
- [Pipeline Methods](#pipeline-methods)
- [Range Sources](#range-sources)
- [Range Transformers](#range-transformers)
- [Range Hooks](#range-hooks)
- [Context Objects](#context-objects)
- [Low-Level APIs](#low-level-apis)
- [TypeScript Support](#typescript-support)

---

## Renderers

Renderers create pipelines for specific output formats. Each renderer provides a chainable API through pipeline methods.

### `string()`

Base renderer that outputs plain text without escaping. Foundation for text-based renderers.

```js
import { string } from 'hitext';
const pipeline = string();
```

**Use cases:**
- Plain text decoration
- Generating Markdown or other text formats
- Custom text transformations
- Full control over output without automatic escaping

**Example:**
```js
const pipeline = string()
    .addLayer([[0, 5]], (content) => `**${content}**`);
console.log(pipeline.render('Hello world'));
// **Hello** world
```

---

### `html()`

Outputs HTML strings with automatic escaping of `<`, `>`, and `&` in text content. Built on string renderer.

```js
import { html } from 'hitext';
const pipeline = html();
```

**Escaping behavior:**
- Text content: Automatically escaped
- Hook output: **Not escaped** (you control the markup)

**Example:**
```js
const pipeline = html()
    .addLayer([[0, 5]], (content) => `<mark>${content}</mark>`);
console.log(pipeline.render('<script>alert("xss")</script>'));
// <mark>&lt;script&gt;</mark>alert("xss")&lt;/script&gt;
```

---

### `tty()`

Outputs terminal strings with ANSI color codes.

```js
import { tty } from 'hitext';
const pipeline = tty();
```

**Helper functions:**

#### `tty.createStyle(...styles)`

Returns factory wrapper for specific ANSI styles.

```js
tty.createStyle('red', 'bold')
// Returns: { createRangeHooks: (context) => ({ open: ..., close: ... }) }
```

#### `tty.createStyleMap(map, fetcher?)`

Returns factory wrapper that maps data values to styles.

```js
tty.createStyleMap({
    error: 'red',
    warning: 'yellow',
    info: 'blue'
})
```

**Parameters:**
- `map` - Object mapping data values to style names
- `fetcher` (optional) - Function to extract map key from context. Default: `({ data, rangeText }) => data ?? rangeText`

**Available styles:**
- **Foreground**: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
- **Bright foreground**: `blackBright`, `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`
- **Background**: `bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`
- **Bright background**: Same pattern with `Bright` suffix
- **Modifiers**: `bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`, `reset`

**Example:**
```js
const pipeline = tty()
    .addLayer(
        rangesForMatch(/ERROR|WARNING|INFO/g),
        tty.createStyleMap({
            ERROR: 'red',
            WARNING: 'yellow',
            INFO: 'blue'
        })
    );
```

---

### `dom(options?)`

Outputs DOM DocumentFragment for browser environments.

```js
import { dom } from 'hitext';
const pipeline = dom({ document: customDocument });
```

**Options:**
- `document` (optional) - Custom document object. Default: `globalThis.document`

**Example:**
```js
const pipeline = dom()
    .addLayer([[0, 5]], {
        wrap: (renderedContent, { createBuffer }) => {
            const span = document.createElement('span');
            span.className = 'highlight';
            span.appendChild(renderedContent);
            return span;
        }
    });

const fragment = pipeline.render('Hello world');
document.body.appendChild(fragment);
```

---

### `jsx()`

Outputs array of JSX children (`JSXChild[]`). Works with React, Preact, Solid, or any JSX implementation.

```jsx
import { jsx } from 'hitext';
const pipeline = jsx();
```

**Example:**
```jsx
const pipeline = jsx()
    .addLayer(
        [[0, 5]],
        (content) => <span className="highlight">{content}</span>
    );

const result = pipeline.render('Hello world');
// result: [<span className="highlight">Hello</span>, ' world']

// Use in component:
function MyComponent() {
    return <div>{result}</div>;
}
```

---

## Pipeline Methods

### `pipeline.addLayer(ranges, hooks, name?)`

Adds a decoration layer to the pipeline. **Returns new pipeline** (immutable).

```js
const enhanced = pipeline.addLayer(ranges, hooks, 'layerName');
```

**Parameters:**

#### `ranges` - Range source

Can be:
- **Array of range objects**: `[{ start: 0, end: 5, data? }]`
- **Array of tuples**: `[[0, 5, data?]]`
- **Generator function**: `(document, createRange, context) => { ... }`
- **Range source function**: Result of `rangesForMatch()`, `rangesCompose()`, etc.

#### `hooks` - Render hooks

Three forms:

**1. Function shortcut** (recommended for simple wrapping):
```js
(renderedContent) => `<mark>${renderedContent}</mark>`
```

**2. Hooks object**:
```js
{
    open: (context) => '<span>',
    close: (context) => '</span>',
    wrap: (renderedContent, context) => `<mark>${renderedContent}</mark>`,
    text: (chunk, context) => escapeHtml(chunk),
    replace: (context) => '***',
    break: true  // Optional: break surrounding ranges
}
```

**3. Factory wrapper** (for renderer-specific features):
```js
{
    createRangeHooks: (rendererContext) => ({
        wrap: (content) => rendererContext.transform(content)
    })
}
```

#### `name` (optional) - Layer name

String identifier for referencing this layer from other layers via `rangesFromLayer(name)`.

**Example:**
```js
const pipeline = html()
    .addLayer(rangesForMatch(/\w+/g), (content) => `<span>${content}</span>`, 'tokens')
    .addLayer(rangesFromLayer('tokens'), (content) => `<mark>${content}</mark>`);
```

---

### `pipeline.render(document, options?)`

Renders document text with all layers applied.

```js
const output = pipeline.render(document, options);
```

**Parameters:**
- `document` - String to render
- `options` (optional) - Object passed to all range generators in pipeline

**Returns:** Output in renderer's format (string, DocumentFragment, JSXChild[], etc.)

**Example:**
```js
function configurableHighlighter(document, createRange, options) {
    if (options?.keywords) {
        const regex = new RegExp(options.keywords.join('|'), 'gi');
        // ... generate ranges
    }
}

const pipeline = html().addLayer(configurableHighlighter, hooks);

// Pass options at render time
const result = pipeline.render('const x = 1', { keywords: ['const', 'let', 'var'] });
```

---

### `pipeline.ranges(document, options?)`

Generates all ranges without rendering. Useful for debugging or processing ranges separately.

```js
const ranges = pipeline.ranges(document, options);
```

**Returns:** Array of range objects with normalized structure: `{ start, end, data, origin, marker }`

**Example:**
```js
const pipeline = html().addLayer(rangesForMatch(/\w+/g), hooks);
const ranges = pipeline.ranges('Hello world');
console.log(ranges);
// [
//   { start: 0, end: 5, data: ['Hello'], marker: Symbol(), origin: undefined },
//   { start: 6, end: 11, data: ['world'], marker: Symbol(), origin: undefined }
// ]
```

---

### `pipeline.rangeHooksMap()`

Returns the complete map of range hooks indexed by marker symbols.

```js
const hooksMap = pipeline.rangeHooksMap();
```

**Returns:** `Map<symbol, RangeHooks>` - Map from marker symbols to hook objects

**Use case:** Advanced rendering scenarios where you need direct access to hooks.

---

## Range Sources

Functions that generate or provide ranges. See [Range Functions Reference](range-functions-reference.md#range-sources) for detailed documentation.

| Function | Description | Example |
|----------|-------------|---------|
| [`rangesForMatch(pattern)`](range-functions-reference.md#rangesformatchpattern) | Pattern matching | `rangesForMatch(/\w+/g)` |
| [`rangesForLines(type?)`](range-functions-reference.md#rangesforlinestype) | Line boundaries | `rangesForLines('line-start')` |
| [`rangesFrom(input)`](range-functions-reference.md#rangesfrominput) | Raw data & document keywords | `rangesFrom('document')` |
| [`rangesFromLayer(name)`](range-functions-reference.md#rangesfromlayername) | Layer reference | `rangesFromLayer('diagnostics')` |
| [`rangesFromOptions(key)`](range-functions-reference.md#rangesfromoptionskey) | User options | `rangesFromOptions('highlights')` |
| [`rangesConcat(...inputs)`](range-functions-reference.md#rangesconcatinputs) | Combine sources | `rangesConcat(ranges1, ranges2)` |
| [`rangesWithFallback(...inputs)`](range-functions-reference.md#rangeswithfallbackinputs) | First non-empty | `rangesWithFallback(primary, fallback)` |
| [`rangesCompose(input, ...fns)`](range-functions-reference.md#rangescomposerangeinput-transformers) | Pipeline composition | `rangesCompose(ranges, transform1, transform2)` |

---

## Range Transformers

Functions that transform existing ranges. See [Range Functions Reference](range-functions-reference.md#range-transformers) for detailed documentation.

| Function | Description | Example |
|----------|-------------|---------|
| [`applyCollapseTo(position)`](range-functions-reference.md#applycollapsetoposition) | Zero-width markers | `applyCollapseTo('start')` |
| [`applyExpandTo(position, lines?)`](range-functions-reference.md#applyexpandtoposition-lines) | Expand boundaries | `applyExpandTo('line', 2)` |
| [`applyMerge()`](range-functions-reference.md#applymerge) | Merge overlapping | `applyMerge()` |
| [`applyInvert(exact?)`](range-functions-reference.md#applyinvertexact) | Negate ranges | `applyInvert()` |
| [`applyFilter(predicate)`](range-functions-reference.md#applyfilterpredicate) | Conditional selection | `applyFilter(r => r.data.severity === 'error')` |
| [`applyPick(selector)`](range-functions-reference.md#applypickselector) | Single selection | `applyPick('first')` |
| [`applySort(comparator?)`](range-functions-reference.md#applysortcomparator) | Custom ordering | `applySort((a, b) => a.start - b.start)` |
| [`applyDataMap(mapper)`](range-functions-reference.md#applydatamapmapper) | Data transformation | `applyDataMap(r => ({ ...r.data, id: r.index }))` |
| [`applyFitToWindow(size?, trim?)`](range-functions-reference.md#applyfittowindowsize-allowtrimming) | Horizontal viewport | `applyFitToWindow(80)` |
| [`applyPadLines(lines, size)`](range-functions-reference.md#applypadlineslines-size) | Add padding | `applyPadLines(2, 50)` |
| [`applyResetOrigin()`](range-functions-reference.md#applyresetorigin) | Clear origins | `applyResetOrigin()` |
| [`applyFallback(...fallbacks)`](range-functions-reference.md#applyfallbackfallbacks) | Provide fallback | `applyFallback(ranges1, ranges2)` |

---

## Range Hooks

Hooks define how ranges are rendered. Only provide hooks you need; missing hooks default to no-op.

### Hook Functions

#### `open(context): OutputUnit | null`

Returns opening markup/tag for a range. Called when range segment starts.

```js
{
    open: ({ data }) => `<span class="${data.type}">`
}
```

#### `close(context): OutputUnit | null`

Returns closing markup/tag for a range. Called when range segment ends.

```js
{
    close: () => '</span>'
}
```

#### `wrap(renderedContent, context): OutputUnit`

Wraps the rendered content of a range segment. Alternative to `open`/`close`.

```js
{
    wrap: (content, { data }) => `<span class="${data.type}">${content}</span>`
}
```

**When to use `wrap` vs `open`/`close`:**
- **Prefer `wrap`** - Works consistently across renderers, more readable
- Use `open`/`close` for side effects or non-wrapping behavior (markers, attributes)
- `wrap` adds slight overhead (extra buffer) but negligible in practice

#### `text(chunk, context): OutputUnit`

Transforms document text chunks. Used by structured renderers to convert text to their format.

```js
{
    text: (chunk) => escapeHtml(chunk)  // Custom escaping
}
```

**Common uses:**
- Escaping special characters
- Converting to TextNodes (DOM)
- Obfuscating sensitive content
- Disabling escaping for raw markup regions

**Inheritance:** Ranges inherit text transformation from render hooks or closest outer range with `text` hook.

#### `replace(context): OutputUnit`

Replaces document text within range with custom content. Original text and nested ranges are skipped.

```js
{
    replace: () => '████'  // Redact content
}
```

**Behavior:**
- Original document text in range is **skipped**
- Ranges **nested entirely within** replaced range are **skipped**
- Can be combined with `open`, `close`, `wrap`
- Execution order: `open` → `replace` → `wrap` → `close`
- `text` hook **not applied** to replacement (inserted as-is)

**Common uses:**
- Content redaction (hide sensitive info)
- Code folding (collapse blocks)
- Template expansion (replace placeholders)
- Content injection at zero-width positions
- Viewport/windowing (hide content outside visible area)

#### `break: boolean`

Flag to prevent surrounding ranges from spanning across this range.

```js
{
    replace: () => '...',
    break: true  // Force surrounding ranges to close and reopen
}
```

**Default behavior (break: false):**
- Ranges that start before and end after a replace range span across it
- They're temporarily closed and reopened

**With break: true:**
- Surrounding ranges are forced to close before and reopen after
- Creates visual separation

---

## Context Objects

### Hook Context

Available in all hook functions (`open`, `close`, `wrap`, `text`, `replace`).

```typescript
interface RangeHookContext<Data = unknown> {
    // Document info
    document: string;              // Full document text
    
    // Current position (updated during rendering)
    offset: number;                // Current position in document (1-based)
    line: number;                  // Current line number (1-based)
    column: number;                // Current column (1-based)
    
    // Segment boundaries (where hooks are called)
    start: number;                 // Segment start position
    end: number;                   // Segment end position
    rangeIndex: number;            // Unique range index in render session
    
    // Range info
    range: RangeRecord<Data>;      // Full range object (original boundaries)
    rangeText: string;             // document.slice(range.start, range.end)
    data: Data;                    // range.data (shortcut)
    
    // Utilities
    lines: LineBoundaries;         // Line operations (lazy-initialized)
    createBuffer(): RenderBuffer;  // Create new render buffer (advanced)
    dump(): object;                // Snapshot of all properties (debugging)
}
```

**Key distinctions:**

- **Segment boundaries**: `context.start` and `context.end` - where current hook is called
- **Range boundaries**: `context.range.start` and `context.range.end` - original range span
- When ranges overlap, they split into segments; hooks called once per segment
- Use `context.offset === context.range.start` to detect first opening vs continuation

**Example:**
```js
{
    wrap: (content, context) => {
        const isFirstSegment = context.offset === context.range.start;
        const prefix = isFirstSegment ? '▶ ' : '↪ ';
        return `${prefix}${content}`;
    }
}
```

### Generation Context

Available in range generator functions and transformer predicates.

```typescript
interface GenerateRangesContext<RenderOptions = unknown> {
    // Render configuration
    renderOptions?: RenderOptions;  // User-provided options from render()
    
    // Layer references
    marker: symbol;                 // Current layer's unique marker
    ranges: RangeRecord[];          // All ranges from all layers
    rangesByMarker: Map<symbol, RangeRecord[]>;  // Ranges grouped by marker
    rangesByName: Map<string, RangeRecord[]>;    // Ranges grouped by layer name
    
    // Line utilities
    lines: LineBoundaries;          // Line operations (lazy-initialized)
}
```

**Example:**
```js
function customGenerator(document, createRange, context) {
    // Access user options
    if (context.renderOptions?.theme === 'dark') {
        // Generate dark theme ranges
    }
    
    // Reference other layers
    const diagnostics = context.rangesByName.get('diagnostics') || [];
    for (const diagnostic of diagnostics) {
        createRange(diagnostic.start, diagnostic.end, { type: 'error' });
    }
}
```

### Operation Context

Available in predicate functions (`applyFilter`, `applyDataMap`, `applySort`).

```typescript
interface RangeOperationContext<RenderOptions = unknown> {
    document: string;               // Full document text
    lines: LineBoundaries;          // Line operations (lazy-initialized)
    renderOptions?: RenderOptions;  // User-provided options
    ranges: RangeRecord[];          // All input ranges (stable array)
}
```

**Example:**
```js
applyFilter((range, index, context) => {
    const line = context.lines.getLine(range.start);
    return line < 100;  // Only ranges in first 100 lines
})
```

### LineBoundaries

Provides efficient line-based operations. Lazy-initialized when first accessed.

```typescript
interface LineBoundaries {
    getLine(offset: number): number;           // Get line number (1-based)
    getColumn(offset: number): number;         // Get column (1-based)
    getOffset(line: number, column: number): number;  // Get offset
    getLineStart(line: number): number;        // Get line start offset
    getLineEnd(line: number): number;          // Get line end offset (after \n)
    getLineContentEnd(line: number): number;   // Get line content end (before \n)
}
```

**Example:**
```js
{
    wrap: (content, { lines, range }) => {
        const line = lines.getLine(range.start);
        const column = lines.getColumn(range.start);
        return `<span data-line="${line}" data-col="${column}">${content}</span>`;
    }
}
```

---

## Low-Level APIs

### `render(document, ranges, rangeHooksMap, renderHooks?)`

Low-level rendering function. Use when you need direct control without pipeline.

```js
import { render } from 'hitext';

const output = render(
    document,
    ranges,
    rangeHooksMap,
    renderHooks
);
```

**Parameters:**
- `document` - String to render
- `ranges` - Array of range objects or iterable
- `rangeHooksMap` - Map from marker symbols to hook objects
- `renderHooks` (optional) - Renderer-specific hooks (text escaping, buffer creation)

**Returns:** Depends on `renderHooks.createBuffer()` implementation

**Example:**
```js
import { render, html } from 'hitext';

const ranges = [
    { start: 0, end: 5, marker: Symbol('highlight') }
];

const rangeHooksMap = new Map([
    [ranges[0].marker, {
        wrap: (content) => `<mark>${content}</mark>`
    }]
]);

const output = render(
    'Hello world',
    ranges,
    rangeHooksMap,
    html().rangeHooksMap()
);
```

---

### `createRenderPipeline(createRenderHooks)`

Creates custom renderer pipeline.

```js
import { createRenderPipeline } from 'hitext';

const myRenderer = createRenderPipeline(createRenderHooks);
```

**Parameters:**
- `createRenderHooks` - Function that returns renderer-specific hooks

```typescript
type CreateRenderHooks = () => {
    createBuffer(): RenderBuffer;     // Create output buffer
    text?: (chunk: string) => any;    // Transform text chunks
    open?: (context) => any;          // Default open hook
    close?: (context) => any;         // Default close hook
};
```

**Example - JSON renderer:**
```js
const jsonRenderer = createRenderPipeline(() => {
    return {
        createBuffer: () => {
            const items = [];
            return {
                value: () => items,
                append: (item) => items.push(item)
            };
        },
        text: (chunk) => ({ type: 'text', value: chunk }),
        open: ({ range }) => ({ type: 'open', range: [range.start, range.end] }),
        close: ({ range }) => ({ type: 'close', range: [range.start, range.end] })
    };
});

const pipeline = jsonRenderer()
    .addLayer([[0, 5]], {
        wrap: (content) => ({ type: 'highlight', content })
    });

const result = pipeline.render('Hello world');
console.log(JSON.stringify(result, null, 2));
```

---

## TypeScript Support

HiText is fully typed with comprehensive TypeScript definitions. See [TypeScript Support](typescript.md) for:

- All exported types and their definitions
- Usage examples with typed generators, hooks, and pipelines
- Type guards and generic utilities
- Best practices for type-safe HiText development

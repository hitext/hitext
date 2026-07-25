# HiText

A powerful text decoration engine that enables combining multiple decorators (syntax highlighting, search highlighting, line numbers, diagnostics, search results, etc.) **without conflicts**. HiText uses a range-based approach: decorators generate ranges independently, then a renderer deterministically merges them and produces output in any format (HTML, terminal, DOM, JSX, or custom).

## Why HiText?

When applying multiple text decorations sequentially (like adding HTML tags for syntax highlighting, then search highlighting, then line numbers), each decoration can interfere with the previous ones. For example, if you add `<span>` tags for syntax, then try to add more tags for search results, your search might match inside the tags you just added, or produce invalid nesting.

**HiText solves this by separating concerns:**

1. **Range Generation** – Each decorator analyzes the **original source text** and generates ranges (e.g., "characters 5-10 are a keyword")
2. **Rendering** – A renderer merges all ranges intelligently and outputs properly nested, non-conflicting formatted text

This means decorators work on clean source text and never interfere with each other, allowing you to freely combine any number of them. You describe *what* should be annotated; HiText handles *how* they nest.

## Features

- ✅ **Combine unlimited decorators** without conflicts
- ✅ **Multiple output formats** – HTML, terminal (TTY), DOM nodes, JSX, or plain text
- ✅ **Flexible API** – Use static ranges, generator functions, or build complex pipelines
- ✅ **TypeScript support** with full type definitions
- ✅ **Zero dependencies**
- ✅ **Dual package** – Supports both ESM and CommonJS
- ✅ **Smart range merging** – Proper nesting and overlap handling

## Installation

```bash
npm install hitext
```

ESM (recommended):

```js
import { html, rangesForMatch } from 'hitext';
```

CommonJS:

```js
const { html, rangesForMatch } = require('hitext');
```

## Why not just mutate strings?

String or DOM mutation approaches break as soon as overlapping decorations appear (e.g. highlight + selection + diff). HiText builds a *single* well‑nested tree from independent intent declarations (ranges) – no intermediate markup parsing, no regex cascading on generated HTML.

## Quick Start

```js
import { html, rangesForMatch } from 'hitext';

// Create a pipeline with HTML renderer
const highlight = html()
    .addLayer(
        rangesForMatch('world'),
        (content) => `<mark>${content}</mark>`
    );

console.log(highlight.render('Hello world! Welcome to the world.'));
// Hello <mark>world</mark>! Welcome to the <mark>world</mark>.
```

This example highlights all occurrences of "world" in the text. The HTML renderer automatically escapes special characters and properly nests the markup.

> **Tip:** Use the compact function form `(content) => ...` for simple wrapping. It's more readable and works consistently across all renderer types (HTML, DOM, JSX, JSON). For more control, use `{ open, close }` or the full `{ wrap, open, close, text }` hooks object.

> Tip: Every `addLayer()` call returns a **new pipeline**. Reuse the pipeline object for multiple `render()` calls for best performance.

## Core Concepts

### Ranges

A **range** defines a segment of text with optional data:

```js
// Object form: { start, end, data? }
{ start: 0, end: 5 }
{ start: 0, end: 5, data: { type: 'keyword' } }

// Tuple form: [start, end, data?]
[0, 5]
[0, 5, { type: 'keyword' }]
```

**Note:** All positions use zero-based indexing and the `end` is exclusive (like typical JS string slice semantics). Ensure `start <= end`; invalid ranges are ignored.

### Range Generators

A **range generator** is a function that analyzes source text and produces ranges:

```js
function highlightNumbers(source, createRange) {
    const regex = /\d+/g;
    let match;
    
    while (match = regex.exec(source)) {
        createRange(match.index, match.index + match[0].length);
    }
}
```

Built-in generators:
- `rangesForMatch(pattern)` – Find pattern matches (string or RegExp). Automatically adds 'g' flag to RegExp patterns if not present.
- `rangesForLines(type?)` – Generate ranges for lines. Types: `'line'` (full lines with newlines, default), `'line-content'` (without newlines), `'newline'` (just newlines), `'line-start'` (zero-length at line start), `'line-end'` (zero-length after newline), `'line-content-end'` (zero-length before newline). Line numbers stored in `data` as 1-based integers.

### Range Hooks

**Range hooks** define how ranges are rendered for a specific output format. Only hooks you need must be provided; missing ones default to no output / identity.

- `open(context)` – Returns opening markup/tag for a range
- `close(context)` – Returns closing markup/tag for a range  
- `wrap(renderedContent, context)` – Wraps the rendered content of the range (alternative to open/close)
- `replace(context)` – Replaces the source text within the range with custom content (skips source text and nested ranges)
- `text(chunk, context)` – Converts source text chunks into renderer-specific units (e.g., TextNode for DOM, object for JSON) or transforms text content

```js
{
    open: ({ data }) => `<span class="${data.type}">`,
    close: () => '</span>'
}
```

**When to use `wrap` vs `open`/`close`:**
- **Prefer `wrap`** – Works consistently across all renderers (string, DOM, JSX, JSON), more readable and straightforward
- Use `open`/`close` for side effects or when you need to emit something before/after a range without wrapping (e.g., adding markers, inserting nodes)
- Note: `open`/`close` is slightly more performant (avoids extra buffer), but the difference is negligible in most cases

**Understanding segments:** When ranges overlap, they are split into segments at interruption points. Each hook (`open`, `close`, `wrap`, `text`) is called once per segment with the segment's boundaries in `context.start` and `context.end`. For example, if range A [1-8] is interrupted by range B [5-10], range A will have two segments: [1-5] and [5-8], and its hooks will be called twice with different segment boundaries each time.

**About the `text` hook:**

The `text` hook is primarily used by structured renderers to convert source text chunks into their specific units (e.g., TextNode for DOM rendering, object entries for JSON rendering). It can also be used for escaping special characters (especially useful for HTML rendering), obfuscating or removing text content from the output, or disabling escaping in regions that contain raw markup. Ranges inherit text transformation behavior from render hooks or the closest outer range with a `text` hook. Use with care, as disabling escaping or transforming content may have unwanted side effects.

**About the `replace` hook:**

The `replace` hook is a powerful feature that replaces the source text within a range with custom content. When a range has a `replace` hook:

- The original source text in the range is **skipped** (not rendered)
- Any ranges **nested entirely within** the replaced range are also skipped
- The `replace` hook returns the replacement content directly
- The `replace` hook can be combined with `open`, `close`, and `wrap` hooks
- Hook execution order: `open` → `replace` → `wrap` → `close`
- The `text` hook is **not applied** to replaced content (replacement is inserted as-is)

Common use cases:
- **Content redaction**: Hide sensitive information (e.g., `replace: () => '████'`)
- **Code folding**: Collapse code blocks (e.g., `replace: () => '...'`)
- **Template expansion**: Replace placeholders with values (e.g., `replace: ({ rangeText }) => variables[rangeText]`)
- **Content injection**: Insert content at zero-length positions (e.g., `{ start: 5, end: 5 }`)
- **Viewport/windowing**: Hide content outside visible area (e.g., `replace: () => '...\n'`)

**Using the `break` flag:**

By default, ranges that **start before** and **end after** a replace range will span across it (being temporarily closed and reopened). Use `break: true` to prevent this:

```js
{
    replace: () => '...',
    break: true  // Forces surrounding ranges to close before and reopen after
}
```

**Function shortcut:** If you only need the `wrap` hook, you can pass the function directly:

```js
// Instead of: { wrap: (renderedContent) => `<mark>${renderedContent}</mark>` }
// You can use:
(renderedContent) => `<mark>${renderedContent}</mark>`
```

The `context` object provides:
- `source` – The full source text being processed
- `offset` – Current position in source text (updated as rendering progresses)
- `line` – Current line number (1-based, updated as rendering progresses)
- `column` – Current column number (1-based, updated as rendering progresses)
- `start` – Current segment start position (where the current hook is called)
- `end` – Current segment end position (where the segment will be interrupted or end)
- `rangeIndex` – Unique index of the current range in the render session (useful for identifying range segments in the output)
- `rangeText` – The text content of the current range (`source.slice(range.start, range.end)`)
- `range` – The full range object being processed (contains original `start`, `end`, `type`, and `data`)
- `data` – Custom data associated with the range (as provided by the generator, shortcut for `range.data`)
- `lines` – LineBoundaries object for line-based operations (lazy-initialized)
- `createBuffer()` – Creates a new render buffer (advanced use)
- `dump()` – Returns a snapshot of all context properties (useful for debugging)

**Note about segments:** When ranges overlap, they are split into segments. Each segment represents a portion of a range between interruption points. The `start` and `end` in the context represent the *segment* boundaries (where hooks are called), not the full range boundaries. To access the original range boundaries, use `context.range.start` and `context.range.end`.

**Example:**
```js
// Range A: [1, 8], Range B: [5, 10] (B interrupts A)
// A is split into two segments: [1, 5] and [5, 8]
{
    wrap(renderedContent, context) {
        console.log(context.start, context.end);        // Segment boundaries
        console.log(context.range.start, context.range.end); // Original range: [1, 8]
        console.log(context.dump());                    // All context properties
        return renderedContent;
    }
}
```

**Note:** The `offset`, `line`, and `column` values are dynamic and reflect the current rendering position, while `source`, `rangeText`, `data` and `range` are specific to the range being processed. The `start` and `end` values represent the current segment boundaries.

### Renderers

A **renderer** creates a pipeline for a specific output format:

- `string()` – Plain text string output (base renderer, no escaping). Use for plain text decoration or generating formats like Markdown.
- `html()` – HTML string output (extends string renderer, auto-escapes `<`, `>`, `&` in text content)
- `dom(options?)` – DOM DocumentFragment (for browser environments)
- `tty()` – Terminal output with ANSI color codes
- `jsx()` – JSX children array (for React, Preact, Solid, etc.)

Each renderer provides a chainable API for building decoration pipelines. The `string()` renderer serves as the foundation for other text-based renderers. All renderers share the same pipeline semantics.

Example:

```js
import { html } from 'hitext';

const pipeline = html();
```

### Pipeline

A **pipeline** is a renderer with layers of decorators:

```js
const pipeline = html()
    .addLayer(ranges1, hooks1)
    .addLayer(ranges2, hooks2)
    .render(sourceText);
```

Pipeline methods:
- `addLayer(ranges, hooks)` – Add a decoration layer (**returns new pipeline**, immutable)
- `render(source, options?)` – Process source text and return formatted output
- `ranges(source, options?)` – Get generated ranges without rendering
- `rangeHooksMap()` – Get the complete range hooks map

**Note:** Pipelines are immutable. Each `addLayer()` call returns a new pipeline without modifying the original. (Internally, a shallow copy of layer metadata is created; no expensive cloning of ranges occurs until `render()`.)

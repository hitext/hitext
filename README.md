<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)
[![Coverage Status](https://coveralls.io/repos/github/hitext/hitext/badge.svg?branch=master)](https://coveralls.io/github/hitext/hitext?branch=master)

A powerful text decoration engine that enables combining multiple decorators (syntax highlighting, search highlighting, line numbers, diagnostics, search results, etc.) **without conflicts**. HiText uses a range-based approach: decorators generate ranges independently, then a renderer deterministically merges them and produces output in any format (HTML, terminal, DOM, JSX, or custom).

> Current version: 1.0.0 beta – API is close to stable. Feedback & issues welcome.

## Table of Contents

1. [Why HiText?](#why-hitext)
2. [Features](#features)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Core Concepts](#core-concepts)
    - [Ranges](#ranges)
    - [Range Generators](#range-generators)
    - [Range Hooks](#range-hooks)
    - [Renderers](#renderers)
    - [Pipeline](#pipeline)
6. [Examples](#examples)
7. [AST-Based Highlighting (No CST Required)](#ast-based-highlighting-no-cst-required)
8. [Advanced Usage](#advanced-usage)
9. [API Reference](#api-reference)
10. [TypeScript Support](#typescript-support)
11. [Design Principles & Range Ordering](#design-principles--range-ordering)
12. [Performance Tips](#performance-tips)
13. [FAQ](#faq)
14. [License](#license)

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
import { html, rangeMatch } from 'hitext';
```

CommonJS:

```js
const { html, rangeMatch } = require('hitext');
```

Node >=14.14 is required (see `engines` field). The package ships dual ESM/CJS entries with types.

## Why not just mutate strings?

String or DOM mutation approaches break as soon as overlapping decorations appear (e.g. highlight + selection + diff). HiText builds a *single* well‑nested tree from independent intent declarations (ranges) – no intermediate markup parsing, no regex cascading on generated HTML.

## Quick Start

```js
import { html, rangeMatch } from 'hitext';

// Create a pipeline with HTML renderer
const highlight = html()
    .addLayer(
        rangeMatch('world'),
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
- `rangeMatch(pattern)` – Find pattern matches (string or RegExp). Automatically adds 'g' flag to RegExp patterns if not present.
- `rangeLines` – Split text into lines, including newline characters (line numbers stored in `data` as 1-based integers)
- `rangeLineContents` – Line content without newline characters (line numbers stored in `data` as 1-based integers)
- `rangeNewlines` – Just the newline characters (`\n`, `\r`, or `\r\n`)

### Range Hooks


**Range hooks** define how ranges are rendered for a specific output format. Only hooks you need must be provided; missing ones default to no output / identity.

- `open(context)` – Returns opening markup/tag for a range
- `close(context)` – Returns closing markup/tag for a range  
- `wrap(renderedContent, context)` – Wraps the rendered content of the range (alternative to open/close)
- `escape(chunk, context)` – Escapes or transforms text chunks within the range

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

**Understanding segments:** When ranges overlap, they are split into segments at interruption points. Each hook (`open`, `close`, `wrap`, `escape`) is called once per segment with the segment's boundaries in `context.start` and `context.end`. For example, if range A [1-8] is interrupted by range B [5-10], range A will have two segments: [1-5] and [5-8], and its hooks will be called twice with different segment boundaries each time.

**About the `escape` hook:**

The `escape` hook allows you to control how text content is escaped or transformed when emitted into the result. This is especially useful for HTML rendering, where you may want to escape special characters, or for disabling escaping in regions that contain raw HTML markup. You can also use `escape` to obfuscate or remove text content from the output, however, it may have unwanted side effects. Ranges inherit escaping behavior from render hooks or the closest outer range with an `escape` hook. Use with care, as disabling escaping may have unwanted side effects.

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
- `rangeText` – The text content of the current range (`source.slice(range.start, range.end)`)
- `range` – The full range object being processed (contains original `start`, `end`, `type`, and `data`)
- `data` – Custom data associated with the range (as provided by the generator, shortcut for `range.data`)
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

## Examples

### Basic Text Highlighting

Highlight specific words:

```js
import { html, rangeMatch } from 'hitext';

const highlighter = html()
    .addLayer(
        rangeMatch(/function|const|let|var/g),
        (content, { data }) => `<span class="keyword" data-token="${data[0]}">${content}</span>`
    );

console.log(highlighter.render('const x = function() {}'));
// <span class="keyword" data-token="const">const</span> x = <span class="keyword" data-token="function">function</span>() {}

// Using capture groups with RegExp
const urlHighlighter = html()
    .addLayer(
        rangeMatch(/(https?):\/\/([^\/\s]+)(\/[^\s]*)?/g),
        (content, { data }) => {
            const [fullMatch, protocol, host, path] = data;
            return `<a href="${fullMatch}" class="url" data-protocol="${protocol}" data-host="${host}">${content}</a>`;
        }
    );
```

### Search Highlighting

```js
import { html, rangeMatch } from 'hitext';

function createSearchHighlighter(searchTerm) {
    return html()
        .addLayer(
            rangeMatch(new RegExp(searchTerm, 'gi')),
            (content, { data }) => `<mark class="search-match" data-match="${data[0]}">${content}</mark>`
        );
}

const highlight = createSearchHighlighter('error');
console.log(highlight.render('Error: Connection error on line 42'));
// <mark class="search-match">Error</mark>: Connection <mark class="search-match">error</mark> on line 42
```

### Line Numbers

```js
import { html, rangeLines } from 'hitext';

const withLineNumbers = html()
    .addLayer(
        rangeLines,
        {
            open: ({ data: lineNum }) => `<div class="line" data-line="${lineNum}">`,
            close: () => '</div>'
        }
    );

const code = 'function hello() {\n  return "world";\n}';
console.log(withLineNumbers.render(code));
// <div class="line" data-line="1">function hello() {
// </div><div class="line" data-line="2">  return "world";
// </div><div class="line" data-line="3">}</div>

// Enhanced line numbers with total line count from source
const withEnhancedLineNumbers = html()
    .addLayer(
        rangeLines,
        {
            open: ({ data: lineNum, source }) => {
                const totalLines = source.split('\n').length;
                const padding = String(totalLines).length;
                const paddedLineNum = String(lineNum).padStart(padding, ' ');
                return `<div class="line" data-line="${lineNum}"><span class="line-number">${paddedLineNum}:</span> `;
            },
            close: () => '</div>'
        }
    );
```

### Plain Text Decoration with String Renderer

The string renderer is perfect for generating plain text formats like Markdown:

```js
import { string, rangeMatch } from 'hitext';

// Generate Markdown from search results
const markdownHighlight = string()
    .addLayer(
        rangeMatch(/important|critical|warning/gi),
        (content) => `**${content}**`  // Wrap in Markdown bold syntax
    );

console.log(markdownHighlight.render('This is important and critical information.'));
// This is **important** and **critical** information.

// Create emphasis with custom markers
const emphasize = string()
    .addLayer(
        rangeMatch(/_([^_]+)_/g),
        (content) => `*${content}*`  // Convert underscores to asterisks
    );

console.log(emphasize.render('This is _emphasized_ text.'));
// This is *_emphasized_* text.
```

### Using Range Hooks

The `wrap` hook wraps the rendered content of a range segment (alternative to `open`/`close`):

```js
import { html, rangeMatch } from 'hitext';

const highlighter = html()
    .addLayer(
        rangeMatch(/\*\*(.+?)\*\*/g),
        {
            wrap: (renderedContent) => `<strong>${renderedContent}</strong>`
        }
    );

console.log(highlighter.render('This is **bold** text'));
// This is <strong>**bold**</strong> text
```

**Using function shortcut:** When you only need the `wrap` hook, pass the function directly:

```js
const highlighter = html()
    .addLayer(
        rangeMatch(/\*\*(.+?)\*\*/g),
        (renderedContent) => `<strong>${renderedContent}</strong>` // Function shortcut!
    );
```

**Accessing segment vs range boundaries:**

When ranges overlap, they are split into segments. Use `context.start`/`context.end` for segment boundaries, and `context.range.start`/`context.range.end` for the original range boundaries:

```js
import { html } from 'hitext';

const ranges = [
    { type: 'outer', start: 0, end: 10, data: { id: 'A' } },
    { type: 'inner', start: 5, end: 15, data: { id: 'B' } }
];

const highlighter = html()
    .addLayer(ranges, {
        outer: {
            wrap(renderedContent, context) {
                // First call: segment [0, 5] (before B starts)
                // Second call: segment [5, 10] (overlapping with B)
                console.log(`Segment: [${context.start}, ${context.end}]`);
                console.log(`Full range: [${context.range.start}, ${context.range.end}]`);
                console.log(`Range text: "${context.rangeText}"`); // Full range content
                return renderedContent;
            }
        },
        inner: {
            wrap(renderedContent, context) {
                // Only one call: segment [5, 15]
                console.log(`Segment: [${context.start}, ${context.end}]`);
                console.log(`Full range: [${context.range.start}, ${context.range.end}]`);
                console.log(`Range text: "${context.rangeText}"`); // Full range content
                return renderedContent;
            }
        }
    });
```

**Debugging with `dump()`:**

Use `context.dump()` to get a snapshot of all context properties for debugging:

```js
const highlighter = html()
    .addLayer(ranges, {
        wrap(renderedContent, context) {
            console.log(context.dump());
            // { source: 'Hello world', offset: 5, line: 1, column: 6, start: 0, end: 5, 
            //   rangeText: 'Hello', range: {...}, data: {...} }
            return renderedContent;
        }
    });
```

### Combining Multiple Decorators

HiText's power lies in seamlessly combining multiple decorators that work on the original source text:

```js
import { html, rangeMatch, rangeLines } from 'hitext';

const codeDisplay = html()
    // Layer 1: Add line numbers
    .addLayer(
        rangeLines,
        (content, { data: lineNum }) =>
            `<div class="line" data-line="${lineNum}">${content}</div>`
    )
    // Layer 2: Highlight keywords
    .addLayer(
        rangeMatch(/\b(const|function|return)\b/g),
        (content) => `<span class="keyword">${content}</span>`
    )
    // Layer 3: Highlight strings
    .addLayer(
        rangeMatch(/"[^"]*"/g),
        (content) => `<span class="string">${content}</span>`
    );

const code = 'const greet = function() {\n  return "Hello";\n}';
console.log(codeDisplay.render(code));
// <div class="line" data-line="1"><span class="keyword">const</span> greet = <span class="keyword">function</span>() {
// </div><div class="line" data-line="2">  <span class="keyword">return</span> <span class="string">"Hello"</span>;
// </div><div class="line" data-line="3">}</div>
```

All three decorators analyze the original source text independently, and HiText ensures they're properly nested in the output without conflicts.

## AST-Based Highlighting (No CST Required)

Many syntax highlighters require a Concrete Syntax Tree (CST) that preserves all whitespace, comments, and token boundaries. HiText offers a lighter approach: generate ranges directly from an Abstract Syntax Tree (AST) using the node offsets already provided by most parsers.

**Why this works:** Modern parsers (Acorn, Babel, SWC, TypeScript, Esprima) already include `start`/`end` offsets in AST nodes. Walk the tree, emit ranges for semantic elements, and let whitespace/comments remain undecorated (or add them as separate layers).

**Benefits over CST reconstruction:**

| Aspect | CST Reconstruction | AST + Ranges |
| ------ | ------------------ | ------------ |
| Complexity | High (preserve trivia) | Low (reuse offsets) |
| Memory | Full concrete tree | Just offsets + metadata |
| Extensibility | Hard to mix layers | Arbitrary layers |
| Maintenance | Parser-specific | Generic walker |

### Example

```js
import { html } from 'hitext';
import * as acorn from 'acorn';

function astSyntaxRanges(source, createRange) {
    const ast = acorn.parse(source, { ecmaVersion: 'latest', ranges: true });
    
    walk(ast, node => {
        switch (node.type) {
            case 'FunctionDeclaration':
                if (node.id) createRange(node.id.start, node.id.end, 'fn');
                break;
            case 'VariableDeclarator':
                if (node.id) createRange(node.id.start, node.id.end, 'var');
                break;
            case 'Literal':
                createRange(node.start, node.end, 'lit');
                break;
        }
    });
}

function walk(node, visit) {
    visit(node);
    for (const key in node) {
        const value = node[key];
        if (Array.isArray(value)) {
            value.forEach(item => item?.type && walk(item, visit));
        } else if (value?.type) {
            walk(value, visit);
        }
    }
}

// Use with any renderer
const pipeline = html()
    .addLayer(astSyntaxRanges, (content, { data }) => `<span class="${data}">${content}</span>`);

console.log(pipeline.render('function greet() { const x = 1; return x; }'));
// Output: <span class="fn">greet</span>... styled output
```

**Reusable across renderers:**

```js
// HTML
html().addLayer(astSyntaxRanges, (content, { data }) => `<span class="${data}">${content}</span>`)

// JSX
jsx().addLayer(astSyntaxRanges, (content, { data }) => <span className={data}>{content}</span>)

// TTY
tty().addLayer(astSyntaxRanges, tty.createStyleMap({ fn: 'cyan', var: 'yellow', lit: 'magenta' }))
```

### Adding Diagnostics

```js
const diagnostics = [
    { start: 9, end: 14, severity: 'warn', message: 'Prefer arrow function' }
];

const withDiagnostics = pipeline
    .addLayer(
        diagnostics.map(d => [d.start, d.end, d]),
        (content, { data }) => `<span class="diag-${data.severity}" title="${data.message}">${content}</span>`
    );
```

All layers work on the original source—HiText handles merging and proper nesting automatically.

## Examples

### Terminal Output

```js
import { tty, rangeMatch } from 'hitext';

const highlighter = tty()
    .addLayer(
        rangeMatch(/ERROR|WARN|INFO/g),
        tty.createStyleMap({
            'ERROR': ['red', 'bold'],
            'WARN': 'yellow',
            'INFO': 'blue'
        })
    );

console.log(highlighter.render('ERROR: Failed\nWARN: Slow\nINFO: Done'));
// Output with colored text in terminal
```

The TTY renderer provides helper functions for easy styling:
- `tty.createStyle(...styles)` – Returns a factory wrapper for specific ANSI styles
- `tty.createStyleMap(map, fetcher?)` – Returns a factory wrapper that maps data values to styles (automatically handles RegExp match arrays by using `data[0]`, falls back to `data ?? rangeText`)

**Example with `createStyleMap`:**
```js
import { tty } from 'hitext';

const highlighter = tty()
    .addLayer(
        // Ranges with data values
        [
            { start: 0, end: 5, data: 'error' },
            { start: 6, end: 11, data: 'warning' }
        ],
        tty.createStyleMap({
            'error': ['red', 'bold'],
            'warning': 'yellow'
        })
    );

// With custom fetcher to extract data from complex objects
const highlighter2 = tty()
    .addLayer(
        [{ start: 0, end: 5, data: { level: 'error' } }],
        tty.createStyleMap(
            { 'error': 'red' },
            ({ data }) => data.level  // Extract the level property
        )
    );

// Using rangeMatch with automatic data - no need for rangeText fallback
const highlighter3 = tty()
    .addLayer(
        rangeMatch(/ERROR|WARN|INFO/g),
        tty.createStyleMap({
            'ERROR': 'red',
            'WARN': 'yellow',
            'INFO': 'blue'
        })
        // Automatically uses data[0] from rangeMatch RegExp results,
        // falls back to data ?? rangeText
    );
```

The factory wrapper pattern gives you access to the renderer's context for advanced use cases:

```js
// Manual factory for complex cases
{
    createRangeHooks: ({ createStyle, createStyleMap, pushStyle, popStyle }) => ({
        open: () => { pushStyle({color: '\u001b[31m'}); return ''; },
        close: () => { popStyle(); return ''; }
    })
}
```

The TTY renderer provides special context methods for styling:
- `context.createStyle(...styles)` – Create hooks for specific ANSI styles
- `context.createStyleMap(map, fetcher?)` – Map data values to styles
- `context.pushStyle(style)` – Manually push a style to the stack
- `context.popStyle()` – Manually pop a style from the stack

Available style names: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `blackBright`, `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright` (foreground colors), and corresponding background colors like `bgRed`, `bgBlue`, etc., plus modifiers like `bold` and `reset`.

### DOM Rendering

```js
import { dom, rangeMatch } from 'hitext';

const highlighter = dom()
    .addLayer(
        rangeMatch('important'),
        (content) => {
            const span = document.createElement('span');
            span.className = 'highlight';
            span.append(content);
            return span;
        }
    );

const fragment = highlighter.render('This is important text');
document.body.appendChild(fragment);
```

### JSX Rendering

```jsx
import { jsx, rangeMatch } from 'hitext';

// Create JSX renderer - returns an array of JSX children
const highlighter = jsx()
    .addLayer(
        rangeMatch(/important/g),
        (renderedContent) => <mark>{renderedContent}</mark>
    );

// Use wrap hook to wrap matched text
const MyComponent = () => {
    const highlighted = highlighter.render('This is important text');

    // highlighted is an array: ['This is ', <mark>important</mark>, ' text']
    return <div>{highlighted}</div>;
};

// Works with React, Preact, Solid, etc.
const SearchHighlight = ({ text, searchTerm }) => {
    const result = jsx()
        .addLayer(
            rangeMatch(new RegExp(searchTerm, 'gi')),
            (content) => <span className="highlight">{content}</span>
        )
        .render(text);

    return <div className="search-result">{result}</div>;
};
```

The JSX renderer returns an array of JSX children (`JSXChild[]`) that can be used directly in any JSX element. Works with React, Preact, Solid, or any JSX implementation.

### Custom Generator

```js
import { html } from 'hitext';

// Generator to highlight TODO comments
function todoGenerator(source, createRange) {
    const regex = /(TODO|FIXME|NOTE):[^\n]*/gi;
    let match;
    
    while (match = regex.exec(source)) {
        createRange(
            match.index,
            match.index + match[0].length,
            match[1].toUpperCase() // Store the marker type
        );
    }
}

const highlighter = html()
    .addLayer(
        todoGenerator,
        (content, { data }) => `<span class="comment comment-${data.toLowerCase()}">${content}</span>`
    );

const code = `
// TODO: Add error handling
// FIXME: Memory leak here  
// NOTE: Optimize later
`;

console.log(highlighter.render(code));
```

### Static Ranges

You can pass ranges directly instead of using generators:

```js
import { html } from 'hitext';

// Using array of tuples
const highlight1 = html()
    .addLayer(
        [[0, 5], [5, 11]], // Highlight positions 0-5 and 5-11
        (content) => `<mark>${content}</mark>`
    );

// Using array of range objects
const highlight2 = html()
    .addLayer(
        [
            { start: 0, end: 5, data: 'greeting' },
            { start: 6, end: 11, data: 'noun' }
        ],
        (content, { data }) => `<span class="${data}">${content}</span>`
    );

console.log(highlight1.render('Hello world!'));
// <mark>Hello</mark> <mark>world</mark>!

console.log(highlight2.render('Hello world!'));
// <span class="greeting">Hello</span> <span class="noun">world</span>!
```

### Using `rangeText` for Content-Based Decisions

The `rangeText` field is especially useful when you need to make rendering decisions based on the actual content of the range:

```js
import { html, rangeMatch } from 'hitext';

// Highlight code identifiers with different styles based on naming convention
const identifierHighlighter = html()
    .addLayer(
        rangeMatch(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g),
        (content, { rangeText }) => {
            // Use rangeText to determine the identifier type
            if (rangeText.startsWith('_')) {
                return `<span class="private-var">${content}</span>`;
            } else if (rangeText === rangeText.toUpperCase()) {
                return `<span class="constant">${content}</span>`;
            } else if (rangeText[0] === rangeText[0].toUpperCase()) {
                return `<span class="class-name">${content}</span>`;
            } else {
                return `<span class="variable">${content}</span>`;
            }
        }
    );

console.log(identifierHighlighter.render('const MAX_SIZE = 100; class MyClass { _private = true; }'));
// const <span class="constant">MAX_SIZE</span> = 100; class <span class="class-name">MyClass</span> { <span class="private-var">_private</span> = true; }
```

### Render Options

Pass options to all generators in the pipeline when calling `render()`:

```js
import { html } from 'hitext';

function customGenerator(source, createRange, options) {
    // Use options to customize behavior
    const pattern = options?.pattern || /\w+/g;
    let match;
    
    while (match = pattern.exec(source)) {
        createRange(match.index, match.index + match[0].length);
    }
}

const pipeline = html()
    .addLayer(
        customGenerator,
        (content) => `<mark>${content}</mark>`
    );

// Pass options as second argument to render()
console.log(pipeline.render('Hello world', { pattern: /world/g }));
// Hello <mark>world</mark>
```

The same options object is passed to all generator functions in the pipeline, allowing you to configure multiple generators with a single options object.

## Advanced Usage

### Direct Rendering

For one-off rendering without creating a pipeline:

```js
import { render } from 'hitext';

const result = render(
    'Hello world',
    [
        { type: 'highlight', start: 0, end: 5, data: null },
        { type: 'highlight', start: 6, end: 11, data: null }
    ],
    {
        highlight: (content) => `<mark>${content}</mark>`
    },
    {
        escape: (chunk) => chunk.replace(/</g, '&lt;') // HTML escape
    }
);
```

### Custom Renderer

Create your own renderer for custom output formats:

```js
import { createRenderPipeline } from 'hitext';

function createJsonRenderer() {
    return createRenderPipeline(() => {
        return {
            createBuffer: () => ({
                nodes: [],
                append(child) { this.nodes.push(child); },
                emit() { return this.nodes; }
            }),
            escape: (chunk, { start, end }) => ({
                type: 'text',
                start,
                end,
                value: chunk
            })
        };
    });
}

const pipeline = createJsonRenderer()
    .addLayer([[0, 5]], {
        wrap: (renderedContent, { start, end, data }) => ({
            type: 'range',
            start,
            end,
            data,
            content: renderedContent
        })
    });

console.log(JSON.stringify(pipeline.render('Hello world'), null, 2));
```

### Reusable Pipeline

Create reusable pipeline builders:

```js
import { html, rangeMatch } from 'hitext';

function createCodeHighlighter(language) {
    const keywords = {
        javascript: /\b(const|let|var|function|return|if|else)\b/g,
        python: /\b(def|class|import|from|return|if|else)\b/g
    };
    
    return html()
        .addLayer(
            rangeMatch(keywords[language] || /(?!)/),
            (content) => `<span class="keyword">${content}</span>`
        )
        .addLayer(
            rangeMatch(/"[^"]*"|'[^']*'/g),
            (content) => `<span class="string">${content}</span>`
        );
}

const jsHighlighter = createCodeHighlighter('javascript');
const pyHighlighter = createCodeHighlighter('python');

console.log(jsHighlighter.render('const x = "hello";'));
console.log(pyHighlighter.render('def hello(): return "world"'));
```

## API Reference

### Renderers

#### `string()`

Creates a pipeline that outputs plain text strings without any escaping. This is the base renderer that serves as the foundation for text-based rendering.

```js
import { string } from 'hitext';
const pipeline = string();

// No escaping - output as-is
const result = pipeline.render('<div>Hello</div>');
// Result: <div>Hello</div>
```

Use cases:
- Plain text decoration
- Generating Markdown or other text formats
- Custom text transformations
- When you need full control over output without automatic escaping

#### `html()`

Creates a pipeline that outputs HTML strings. Built on top of the string renderer, automatically escapes `<`, `>`, and `&` in text content to prevent XSS vulnerabilities.

```js
import { html } from 'hitext';
const pipeline = html();

// Example: special characters are automatically escaped
const result = pipeline.render('<script>alert("xss")</script>');
// Result: &lt;script&gt;alert("xss")&lt;/script&gt;
```

#### `tty()`

Creates a pipeline that outputs terminal strings with ANSI color codes.

```js
import { tty } from 'hitext';
const pipeline = tty();
```

Provides helper functions for styling:
- `tty.createStyle(...styles)` – Returns a factory wrapper for given ANSI styles
- `tty.createStyleMap(map, fetcher?)` – Returns a factory wrapper that maps data to styles

Example:
```js
const pipeline = tty()
    .addLayer(
        [[0, 5]],
        tty.createStyle('cyan', 'bold')
    );
```

#### `dom(options?)`

Creates a pipeline that outputs DOM DocumentFragment.

```js
import { dom } from 'hitext';
const pipeline = dom({ document: customDocument });
```

Options:
- `document` (optional) – Custom document object (defaults to `globalThis.document`)

#### `jsx()`

Creates a pipeline that outputs an array of JSX children (`JSXChild[]`). Works with React, Preact, Solid, or any JSX implementation.

```jsx
import { jsx } from 'hitext';

const pipeline = jsx();
const result = pipeline
    .addLayer([{ start: 0, end: 5 }], {
        wrap: (renderedContent) => <span className="highlight">{renderedContent}</span>
    })
    .render('Hello, world!');

// result is an array: [<span class="highlight">Hello</span>, ', world!']
// Use directly in JSX: <div>{result}</div>
```

The renderer returns an array that can be used directly as JSX children in any JSX element.

### Generators

#### `rangeMatch(pattern)`

Generates ranges for all pattern matches. RegExp patterns are automatically given the global flag if not present.

```js
import { rangeMatch } from 'hitext';

// String pattern - finds all occurrences
rangeMatch('hello')

// RegExp pattern - 'g' flag automatically added if missing
rangeMatch(/\w+/)
rangeMatch(/error/i)  // Becomes /error/gi internally
```

**Data in generated ranges:**
- For **string patterns**: The matched string is stored as `data`
- For **RegExp patterns**: The full match object (including capture groups) is stored as `data`
- Access the matched text via `data` (strings) or `data[0]` (RegExp match objects)

#### `rangeLines`

Generates ranges for each line (including newline characters). Line numbers (1-based) are stored in `data`.

```js
import { rangeLines } from 'hitext';

pipeline.addLayer(rangeLines, {
    open: ({ data: lineNum }) => `Line ${lineNum}: `
});
```

#### `rangeLineContents`

Generates ranges for line content without newline characters. Line numbers (1-based) are stored in `data`.

```js
import { rangeLineContents } from 'hitext';
```

#### `rangeNewlines`

Generates ranges for just the newline characters.

```js
import { rangeNewlines } from 'hitext';
```

### Pipeline Methods

#### `pipeline.addLayer(ranges, hooks)`

Adds a decoration layer to the pipeline. Returns a new pipeline instance without modifying the original (immutable).

```js
const basePipeline = html();
const withHighlight = basePipeline.addLayer(ranges, hooks);

// basePipeline is unchanged, withHighlight is a new pipeline
```

Parameters:
- `ranges` – Array of ranges, range tuples, or a generator function
- `hooks` – Range hooks object, function shortcut, or factory wrapper

**Range hooks forms:**

1. **Function shortcut** (recommended) – When you only need the `wrap` hook
```js
(renderedContent) => `<mark>${renderedContent}</mark>`
```
This is the most common and readable form. Works consistently across all renderer types.

2. **Plain object** – For using `open`/`close` hooks or multiple hooks
```js
{
    open: () => '<span>',
    close: () => '</span>'
}
```
Use when you need side effects or non-wrapping behavior (e.g., adding attributes, inserting markers).

3. **Factory wrapper** – For accessing renderer context (e.g., TTY styling)
```js
{
    createRangeHooks: (context) => ({
        wrap: (renderedContent) => context.transform(renderedContent)
    })
}
```

#### `pipeline.render(source, options?)`

Processes source text and returns formatted output.

```js
const output = pipeline.render('Hello world', { /* options */ });
```

#### `pipeline.ranges(source, options?)`

Generates ranges without rendering.

```js
const ranges = pipeline.ranges('Hello world');
```

#### `pipeline.rangeHooksMap()`

Returns the complete range hooks map.

```js
const hooksMap = pipeline.rangeHooksMap();
```

### Low-Level APIs

#### `render(source, ranges, rangeHooksMap, renderHooks?)`

Low-level rendering function.

```js
import { render } from 'hitext';

const output = render(source, ranges, rangeHooksMap, renderHooks);
```

#### `createRenderPipeline(createRenderHooks)`

Creates a custom renderer pipeline.

```js
import { createRenderPipeline } from 'hitext';

const myRenderer = createRenderPipeline(() => ({
    createBuffer: () => ({ /* ... */ }),
    escape: (chunk) => chunk,
    open: (context) => null,
    close: (context) => null
}));
```

## TypeScript Support

HiText is written in TypeScript and provides full type definitions.

### Typing Range Data

```typescript
import { html, RangeHookContext } from 'hitext';

interface TokenData {
    type: 'keyword' | 'string' | 'number';
}

// Custom generator with typed data
function tokenGenerator(source: string, createRange) {
    // ... your logic here
    createRange(0, 5, { type: 'keyword' } as TokenData);
}

const highlighter = html()
    .addLayer<TokenData>(
        tokenGenerator,
        (content, context: RangeHookContext<TokenData>) => {
            // context.data is properly typed as TokenData
            // Access segment boundaries: context.start, context.end
            // Access full range: context.range.start, context.range.end
            // Debug with: context.dump()
            return `<span class="${context.data.type}">${content}</span>`;
        }
    );
```

### Typing Render Options

You can specify custom render options that will be passed to all generators:

```typescript
import { html } from 'hitext';

type MyRenderOptions = { 
    lang: 'js' | 'css';
    theme?: 'light' | 'dark';
};

function languageAwareGenerator(
    source: string, 
    createRange, 
    options?: MyRenderOptions
) {
    if (options?.lang === 'js') {
        // JavaScript-specific highlighting
    } else if (options?.lang === 'css') {
        // CSS-specific highlighting
    }
}

// Specify render options type when creating the pipeline
const highlighter = html<MyRenderOptions>()
    .addLayer(
        languageAwareGenerator,  // options parameter is typed as MyRenderOptions
        (content) => `<span class="token">${content}</span>`
    );

// render() method expects MyRenderOptions as second argument
const result = highlighter.render('const x = 1;', { lang: 'js' });
```

### Exported Types

All core types are exported for use in your application:
- `Range`, `RangeTuple` – Range type definitions
- `RangeHooks`, `RangeHookContext` – Hook-related types
- `GenerateRanges`, `CreateRange` – Generator function types
- `PipelineNode` – Pipeline type
- `RenderHooks`, `RenderBuffer` – Renderer-related types

## Design Principles & Range Ordering

HiText's rendering algorithm sorts and walks ranges to produce a *well‑nested* output even when input ranges overlap arbitrarily:

Ordering sort keys (in priority):
1. `start` ascending
2. `end` descending (longer ranges open first so shorter ones nest inside)
3. Layer insertion order (earlier `addLayer()` → higher priority when tie remains)

During traversal:
* Ranges that start before the currently closing set are opened immediately.
* When a new range overlaps and extends beyond already opened shorter ranges, those shorter ranges get closed first to maintain proper nesting.
* Invalid ranges (`start > end`, non‑finite numbers) are skipped silently.

This approach guarantees deterministic, valid nesting without requiring a tree structure upfront.

Design goals:
* Pure, side‑effect free range generation
* Deterministic rendering
* Zero dependencies & small surface area
* Extensibility via custom renderers / hooks factories

### ASCII Diagrams

Below, `[` `)` indicate half‑open intervals `[start, end)`. Layers are labeled A, B, C in order of `addLayer()` (A added first). Longer ranges open first when they share the same start.

**Understanding segments:** When ranges overlap, they are split into segments at interruption points. Each segment gets its own `open`, `wrap`, and `close` hook calls with segment-specific boundaries in `context.start` and `context.end`. The original range boundaries remain accessible via `context.range.start` and `context.range.end`.

1. Simple nesting (no overlap, no segments)

```
Source:  0 1 2 3 4 5 6 7 8 9
Ranges:
    A: [0-----------10)     layer added first
    B:     [3---7)          layer added second

Sorting: A before B (A starts earlier)
Events:
    @0:  open A    context: { start: 0, end: 10, range: [0, 10) }
    @3:  open B    context: { start: 3, end: 7, range: [3, 7) }
    @7:  close B   context: { start: 3, end: 7, range: [3, 7) }
    @10: close A   context: { start: 0, end: 10, range: [0, 10) }

Output: <A>0 1 2 <B>3 4 5 6</B> 7 8 9</A>

Note: No segmentation here - B is fully nested inside A, so each range
has only one segment matching its original boundaries.
```

2. Overlap (crossing) - ranges split into segments

```
Source:  0 1 2 3 4 5 6 7 8 9 10
Ranges:
    A: [0--------8)         starts first
    B:     [3-----------11) starts later, extends beyond A

Algorithm: When B opens at offset 3, range A must be closed temporarily
to maintain proper nesting. A is split into two segments: [0, 3) and [3, 8).

Segments created:
    A₁: [0, 3)   - before B starts
    A₂: [3, 8)   - overlapping with B  
    B:  [3, 11)  - one segment (not interrupted)

Hook events with context values:
    @0:  open A₁     { start: 0, end: 3,  range: [0, 8) }
    @3:  wrap A₁     { start: 0, end: 3,  range: [0, 8) }
    @3:  close A₁    { start: 0, end: 3,  range: [0, 8) }
    @3:  open B      { start: 3, end: 11, range: [3, 11) }
    @3:  open A₂     { start: 3, end: 8,  range: [0, 8) }  ← same range, new segment
    @8:  wrap A₂     { start: 3, end: 8,  range: [0, 8) }
    @8:  close A₂    { start: 3, end: 8,  range: [0, 8) }
    @11: wrap B      { start: 3, end: 11, range: [3, 11) }
    @11: close B     { start: 3, end: 11, range: [3, 11) }

Output: <a>012</a><b><a>34567</a>890</b>

Key insight: Range A's hooks are called twice (once per segment) with different
segment boundaries, but context.range always shows [0, 8). This allows hooks to
distinguish between first opening vs. continuation: check if offset === range.start.
```

3. Same start, different lengths

```
Ranges:
    A: [0------------12)    longer, opens first (end desc rule)
    B: [0----4)             shorter, opens after A

Sort: Both start at 0, but A has later end (12 > 4), so A opens before B
Events:
    @0:  open A    context: { start: 0, end: 12, range: [0, 12) }
    @0:  open B    context: { start: 0, end: 4,  range: [0, 4) }
    @4:  close B   context: { start: 0, end: 4,  range: [0, 4) }
    @12: close A   context: { start: 0, end: 12, range: [0, 12) }

Output: <A><B>0 1 2 3</B> 4 5 ... 11</A>

Note: No segmentation - B is fully nested inside A at the same starting point.
```

4. Equal spans resolved by layer order

```
Ranges:
    A: [2----6)    layer added first
    B: [2----6)    layer added second (same span)

Sort: Identical start & end, so layer order (priority) decides: A before B
Events:
    @2: open A    context: { start: 2, end: 6, range: [2, 6) }
    @2: open B    context: { start: 2, end: 6, range: [2, 6) }
    @6: close B   context: { start: 2, end: 6, range: [2, 6) }
    @6: close A   context: { start: 2, end: 6, range: [2, 6) }

Output: <A><B>2 3 4 5</B></A>
```

5. Multiple nested levels (chain)

```
Ranges:
    A: [0--------------14)
    B:    [4------10)
    C:         [7--9)

Events:
    @0:  open A    context: { start: 0, end: 14, range: [0, 14) }
    @4:  open B    context: { start: 4, end: 10, range: [4, 10) }
    @7:  open C    context: { start: 7, end: 9,  range: [7, 9) }
    @9:  close C   context: { start: 7, end: 9,  range: [7, 9) }
    @10: close B   context: { start: 4, end: 10, range: [4, 10) }
    @14: close A   context: { start: 0, end: 14, range: [0, 14) }

Output: <A>0 1 2 3 <B>4 5 6 <C>7 8</C> 9</B> 10 11 12 13</A>

Note: Pure nesting with no interruptions - each range has one segment.
```

6. Complex: Multiple interruptions create multiple segments

```
Source:  0 1 2 3 4 5 6 7 8 9 10 11 12
Ranges:
    A: [0------------------12)  outer range
    B:     [3-----7)             interrupts A
    C:             [9---11)      interrupts A again

Algorithm: A is interrupted twice, creating three segments:
    A₁: [0, 3)   - before B
    A₂: [3, 7)   - between B's open and close (nested)
    A₃: [7, 9)   - between B and C
    A₄: [9, 11)  - between C's open and close (nested)
    A₅: [11, 12) - after C

Events:
    @0:  open A₁     { start: 0, end: 3, range: [0, 12) }
    @3:  wrap A₁     { start: 0, end: 3, range: [0, 12) }
    @3:  close A₁    { start: 0, end: 3, range: [0, 12) }
    @3:  open B      { start: 3, end: 7, range: [3, 7) }
    @3:  open A₂     { start: 3, end: 7, range: [0, 12) }
    @7:  wrap A₂     { start: 3, end: 7, range: [0, 12) }
    @7:  close A₂    { start: 3, end: 7, range: [0, 12) }
    @7:  close B     { start: 3, end: 7, range: [3, 7) }
    @7:  open A₃     { start: 7, end: 9, range: [0, 12) }
    @9:  wrap A₃     { start: 7, end: 9, range: [0, 12) }
    @9:  close A₃    { start: 7, end: 9, range: [0, 12) }
    @9:  open C      { start: 9, end: 11, range: [9, 11) }
    @9:  open A₄     { start: 9, end: 11, range: [0, 12) }
    @11: wrap A₄     { start: 9, end: 11, range: [0, 12) }
    @11: close A₄    { start: 9, end: 11, range: [0, 12) }
    @11: close C     { start: 9, end: 11, range: [9, 11) }
    @11: open A₅     { start: 11, end: 12, range: [0, 12) }
    @12: wrap A₅     { start: 11, end: 12, range: [0, 12) }
    @12: close A₅    { start: 11, end: 12, range: [0, 12) }

Output: <a>012</a><b><a>3456</a></b><a>78</a><c><a>90</a></c><a>1</a>

Wait, this doesn't match reality - nested ranges DON'T interrupt! Let me reconsider...

Actually, B and C are fully nested in A (they end before A ends), so they DON'T
create interruptions. A has only ONE segment [0, 12) with nested B and C inside:

Corrected events:
    @0:  open A      { start: 0, end: 12, range: [0, 12) }
    @3:  open B      { start: 3, end: 7, range: [3, 7) }
    @7:  close B     { start: 3, end: 7, range: [3, 7) }
    @9:  open C      { start: 9, end: 11, range: [9, 11) }
    @11: close C     { start: 9, end: 11, range: [9, 11) }
    @12: close A     { start: 0, end: 12, range: [0, 12) }

Output: <A>0 1 2 <B>3 4 5 6</B> 7 8 <C>9 10</C> 11</A>

Key insight: Only ranges that EXTEND BEYOND a parent range cause interruptions.
Nested ranges that end before their parent don't split the parent into segments.
```

7. Invalid ranges (silently ignored)

```
    X: [5, 3)       (start > end)  → skipped
    Y: [2, NaN)     (non-finite)   → skipped  
    Z: [2--4)       (valid)         → rendered normally
```

### Summary

- **No segmentation** when ranges are purely nested (child ends before parent)
- **Segmentation occurs** when ranges overlap and extend beyond each other
- Each segment gets its own `open`, `wrap`, `close` hook calls
- `context.start`/`end` = current segment boundaries
- `context.range.start`/`end` = original range boundaries (unchanged across segments)
- Use `context.offset === context.range.start` to detect first opening vs continuation

These rules ensure a single linear pass can maintain a stack of active ranges and always emit well‑nested output.

## Performance Tips

HiText is designed to be fast; a few practical considerations:

- Reuse pipelines instead of rebuilding them each time you render.
- Prefer static or cached ranges for expensive analyses (e.g. syntax tokens).
- Keep generator regex patterns simple; avoid catastrophic backtracking.
- Avoid generating extremely large numbers of tiny adjacent ranges when a single wrapping range (`open`/`close`) would suffice.
- Use the function shortcut `(content) => ...` when only `wrap` is needed; it avoids two extra hook calls.

### Common Patterns
- Empty hooks are fine – return `null` or omit keys.
- Provide `data` in ranges to drive styling (e.g. token type, severity).
- Compose pipelines by starting from a base (e.g. `baseSyntax = html().addLayer(...);` then `search = baseSyntax.addLayer(...);`).

### Debugging
- `pipeline.ranges(source)` – inspect raw computed ranges.
- `pipeline.rangeHooksMap()` – verify which markers have hooks.
- Ensure indices are zero-based and `end` is exclusive.

## FAQ

**Q: How do I nest decorations that partially overlap?**  
Just generate each independently. HiText enforces proper nesting order automatically.

**Q: Can I mutate the generated ranges?**  
You can, but it's better (and cheaper) to regenerate or wrap via another layer. Pipelines are immutable.

**Q: Does order of `addLayer()` matter?**  
Yes. When two ranges have identical `start` and `end`, earlier layers take precedence (open earlier / close later) due to the ordering rule.

**Q: How do I escape HTML?**  
Use the `html()` renderer – it escapes `&`, `<`, `>` automatically. For custom renderer, supply an `escape` hook.

**Q: Can I render to AST / JSON?**  
Yes – create a custom renderer via `createRenderPipeline` (see Custom Renderer example).

**Q: How to integrate with React / Preact?**  
Use `jsx()` – it returns an array of children you can embed directly.

**Q: Are there plans for source maps or position mapping after render?**  
Positions currently refer to *source* only. If you need mapping, wrap a `wrap` hook to collect emitted offsets.

**Q: Why not use an existing highlighter?**  
HiText is *not* a syntax highlighter; it is an orchestration & rendering core. You can plug in any tokenizer, plus additional decoration layers.

## License

MIT

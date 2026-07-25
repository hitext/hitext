<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)
[![Coverage Status](https://coveralls.io/repos/github/hitext/hitext/badge.svg?branch=master)](https://coveralls.io/github/hitext/hitext?branch=master)

A range-based text decoration engine that solves the problem of **combining multiple text annotations** (syntax highlighting, search results, diagnostics, diff markers, etc.) **without conflicts or corruption**.

Unlike traditional string mutation approaches that break when decorations overlap, HiText lets each decorator work independently on the original text, then intelligently merges all annotations into properly nested output.

## Table of Contents

1. [The Problem](#the-problem)
2. [How HiText Works](#how-hitext-works)
3. [Use Cases](#use-cases)
4. [Features](#features)
5. [Installation](#installation)
6. [Quick Start](#quick-start)
7. [Core Concepts](#core-concepts)
8. [Examples](#examples)
9. [Documentation](#documentation)

---

## The Problem

**How do you combine two independent text decorators?**

Imagine you have:
1. **Syntax highlighter** - turns source code into HTML with `<span>` tags
2. **Diagnostic overlay** - marks errors/warnings at specific source positions

```js
const code = 'const error = true';

// Diagnostic data from linter (positions in SOURCE code)
const diagnostic = { start: 6, end: 11, message: 'unused variable' };

// Approach 1: Highlight first, then add diagnostics
let highlighted = syntaxHighlight(code);
// → '<span class="keyword">const</span> error = true'
// ❌ Now diagnostic positions (6-11) are INVALID!
//    Position 6 in source is now position 30+ in markup
//    We'd need to parse HTML and translate source→markup positions

// Approach 2: Add diagnostics first, then highlight  
let withDiagnostics = addDiagnostics(code, diagnostic);
// → 'const <mark title="unused variable">error</mark> = true'
let highlighted = syntaxHighlight(withDiagnostics);
// ❌ Grammar-based parser fails on invalid syntax
// ❌ Regex-based highlighter treats markup as source code:
// → '<span class="keyword">const</span> &lt;mark title="unused <span class="keyword">var</span>iable"&gt;<span class="keyword">error</span>&lt;/mark&gt; = <span class="keyword">true</span>'
//    Escapes '<' and '>', highlights "var" inside attribute, chaos!

// Approach 3: Make highlighter diagnostic-aware
let highlighted = syntaxHighlight(code, { diagnostics: [diagnostic] });
// ❌ Now highlighter must know about diagnostics, line numbers, search, etc.
//    Each decorator must know about ALL others - exponential complexity!
```

**The fundamental issue:**
- Decorator A produces markup, destroying original text positions
- Decorator B needs original positions, not markup positions  
- No way to compose them without position translation or coordination
- Each new decorator requires modifying all existing ones

This is why most code editors implement syntax highlighting + diagnostics + search as a **single monolithic system** instead of composable decorators.

---

## How HiText Works

HiText uses a **three-stage pipeline** that separates concerns:

```
Original Text (document) → [Generate Ranges] → [Merge & Resolve] → [Render Output]
```

### 1. Generate Ranges

Each decorator analyzes the **original text** and generates ranges independently:

```js
// Syntax highlighter generates ranges
[{ start: 0, end: 5, data: 'keyword' }]   // "const"

// Error checker generates ranges  
[{ start: 6, end: 11, data: 'error' }]    // "error"

// Both work on original text "const error = true"
// Neither knows about the other - no conflicts!
```

### 2. Merge & Resolve

The engine deterministically merges overlapping ranges:

- Sorts ranges by position and priority
- Splits overlapping ranges into non-overlapping segments
- Determines correct nesting order
- Maintains a proper tree structure

### 3. Render Output

Renderer walks the tree and produces output in any format:

```js
html()    → '<span class="keyword">const</span> <mark>error</mark> = true'
tty()     → '\x1b[34mconst\x1b[0m \x1b[41merror\x1b[0m = true'
dom()     → DocumentFragment with properly nested nodes
jsx()     → [<span>const</span>, ' ', <mark>error</mark>, ' = true']
```

**Key insight:** Decorators describe *what* should be annotated. HiText determines *how* to nest them.

---

## Use Cases

HiText is ideal for applications that combine multiple text annotations:

### Code Editors & Viewers
- Syntax highlighting + search results + diagnostics + breakpoints
- Diff highlighting + blame info + coverage markers
- Line numbers + fold indicators + error underlines

### Documentation Tools
- Markdown rendering + syntax highlighting + link previews
- Code examples + error annotations + interactive tooltips

### Search & Analytics
- Search term highlighting + entity recognition + sentiment analysis
- Multiple simultaneous search queries with different colors

### Terminal Applications
- Log viewers with multiple filters and highlighting
- CLI tools with syntax coloring + error highlighting + progress indicators

### Content Editors
- Rich text with comments + tracked changes + suggestions
- Collaborative editing with multiple user selections

**When to use HiText:**
- Multiple decorators that can overlap
- Decorators that should work independently
- Need deterministic, conflict-free output
- Want to avoid complex nesting logic

**When NOT to use HiText:**
- Single decorator, no overlaps
- Simple sequential replacements work fine
- DOM manipulation is more appropriate

---

## Features

- ✅ **Conflict-free composition** - Unlimited decorators without interference
- ✅ **Multiple output formats** - HTML, terminal (ANSI), DOM, JSX, plain text
- ✅ **Smart range merging** - Automatic nesting and overlap resolution
- ✅ **Flexible API** - Static ranges, generators, transformers, or pipelines
- ✅ **TypeScript support** - Full type definitions with generics
- ✅ **Zero dependencies** - Lightweight and fast
- ✅ **Dual package** - ESM and CommonJS support

---

## Installation

```bash
npm install hitext
```

```js
// ESM (recommended)
import { html, rangesForMatch } from 'hitext';

// CommonJS
const { html, rangesForMatch } = require('hitext');
```

---

## Quick Start

```js
import { html, rangesForMatch } from 'hitext';

const code = 'const x = function() { return 42; }';

// Create pipeline with two decoration layers
const highlight = html()
    // Layer 1: Highlight keywords
    .addLayer(
        rangesForMatch(/const|function|return/gi),
        (content) => `<span class="keyword">${content}</span>`
    )
    // Layer 2: Highlight numbers
    .addLayer(
        rangesForMatch(/\d+/g),
        (content) => `<span class="number">${content}</span>`
    );

console.log(highlight.render(code));
// <span class="keyword">const</span> x = <span class="keyword">function</span>() { <span class="keyword">return</span> <span class="number">42</span>; }
```

**What happened:**
1. Layer 1 generated ranges for keywords: `[0-5]`, `[10-18]`, `[23-29]`
2. Layer 2 generated ranges for numbers: `[30-32]`
3. Engine merged ranges and produced properly nested HTML
4. Renderer escaped special characters and emitted output

Each layer works on the original text `'const x = function()...'` - no conflicts!

---

## Core Concepts

### Mental Model

Think of HiText as a **multi-layer overlay** on text:

```
Layer 3:  [====error====]                    (diagnostics)
Layer 2:     [==kw==]  [==kw==]              (syntax)
Layer 1:  [========line 1========]           (line boundaries)
Text:     const error = true;
```

Each layer independently marks regions (ranges). HiText merges them into a tree:

```
line1
├─ "const "
├─ keyword("error")
│  └─ error("error")
└─ " = true;"
```

Then renders: `<div class="line"><span class="kw"><mark class="err">error</mark></span>...</div>`

### Key Types

#### Range

A text segment with optional metadata:

```typescript
{ start: 0, end: 5, data: { type: 'keyword' } }
```

- `start` - Zero-based start position (inclusive)
- `end` - Zero-based end position (exclusive)
- `data` - Optional custom metadata

#### Range Generator

Function that creates ranges from text:

```typescript
(document: string, createRange, context) => {
    const regex = /\d+/g;
    let match;
    while ((match = regex.exec(document))) {
        createRange(match.index, match.index + match[0].length, {
            type: 'number'
        });
    }
}
```

Access original text via `document`, create ranges via `createRange()`. Range hooks receive `rangeText` and can use `document.slice(start, end)` if needed.

#### Range Hooks

Define rendering behavior:

```typescript
const rangeHooks = {
    // Emitted when range segment opens
    open: (context) => '<span class="keyword">',
    
    // Emitted when range segment closes
    close: (context) => '</span>',

    // Wraps segment rendered content
    wrap: (content, context) => `<mark>${content}</mark>`,
    
    // Transforms text chunks
    text: (chunk, context) => chunk.toUpperCase(),
    
    // Replaces range content entirely
    replace: (context) => '***'
}
```

**Shortcut:** For simple wrapping, use a function:

```js
(content) => `<mark>${content}</mark>`
```

This works consistently across all renderers (HTML, DOM, JSX).

#### Renderer

Creates output in specific format:

- **`html()`** - HTML string with auto-escaping
- **`string()`** - Plain text (no escaping)
- **`tty()`** - Terminal with ANSI colors
- **`dom()`** - DOM DocumentFragment
- **`jsx()`** - JSX children array

#### Pipeline

Chain of decoration layers:

```js
const pipeline = html()
    .addLayer(ranges1, hooks1, 'layer1')
    .addLayer(ranges2, hooks2, 'layer2');

// Pipelines are immutable - returns new instance
const extended = pipeline.addLayer(ranges3, hooks3);

// Render multiple documents with same pipeline
const output1 = pipeline.render(doc1);
const output2 = pipeline.render(doc2);
```

### Built-in Functions

**Range Sources** (generate ranges):
- `rangesForMatch(pattern)` - Find pattern matches
- `rangesForLines(type)` - Mark line boundaries
- `rangesFrom(input)` - Convert raw data or document keywords

**Range Transformers** (modify ranges):
- `applyFilter(predicate)` - Conditional selection
- `applyMerge()` - Merge overlapping ranges
- `applyExpandTo(boundary, lines)` - Expand to line/word boundaries
- `applyInvert()` - Negate ranges (select gaps)

**Composition**:
- `rangesCompose(source, ...transformers)` - Chain transformations
- `rangesConcat(...sources)` - Combine multiple sources

---

## Examples

### Syntax Highlighting with Diagnostics

```js
import { html, rangesForMatch, rangesFrom } from 'hitext';

const code = 'const error = undefined;';

const diagnostics = [
    { start: 6, end: 11, data: {
        severity: 'error',
        message: 'Variable is never used'
    } }
];

const editor = html()
    .addLayer(
        rangesForMatch(/const|let|var|undefined/gi),
        (content) => `<span class="keyword">${content}</span>`
    )
    .addLayer(
        rangesFromOptions('diagnostics'),
        (content, { data: { severity, message } }) => 
            `<mark class="diagnostic-${severity}" title="${message}">${content}</mark>`
    );

console.log(editor.render(code, { diagnostics }));
// <span class="keyword">const</span> <mark class="diagnostic-error" title="Variable is never used">error</mark> = <span class="keyword">undefined</span>;
```

### Search Results with Context

```js
import { html, rangesCompose, rangesForMatch, applyExpandTo, applyMerge } from 'hitext';

const searchResults = html()
    .addLayer('search-match',
        rangesFromOptions(({ renderOptions }) =>
            rangesForMatch(renderOptions.pattern)
        )
    )
    .addLayer(
        // Find matches and expand to show context
        rangesCompose(
            rangesByName('search-match'),
            applyExpandTo('line', 2),   // Expand to line boundaries, add 2 lines before/after
            applyMerge()                // Merge overlapping contexts
        ),
        (content) => `<div class="search-context">${content}</div>`
    )
    .addLayer(
        // Highlight actual matches
        rangesForMatch('search-match'),
        (content) => `<mark>${content}</mark>`
    );
```

### Line Numbers with Syntax

```js
import { html, rangesForLines, rangesForMatch } from 'hitext';

const codeViewer = html()
    .addLayer(
        rangesForLines('line-content'), // Line boundaries without line breaks
        (content, { line }) => 
            `<div class="line"><span class="line-num">${line}</span>${content}</div>`
    )
    .addLayer(
        ...highlighter
    );

const code = 'function greet() {\n  return "Hello";\n}';
console.log(codeViewer.render(code, { syntax: 'javascript' }));
// <div class="line"><span class="line-num">1</span><span class="keyword">function</span> greet() {</div>
// <div class="line"><span class="line-num">2</span>  <span class="keyword">return</span> "Hello";</div>
// <div class="line"><span class="line-num">3</span>}</div>
```

### Terminal Output with Colors

```js
import { tty, rangesForMatch } from 'hitext';

const logHighlighter = tty()
    .addLayer(
        rangesForMatch(/ERROR|WARN|INFO/g),
        tty.createStyleMap({  // use rangeText as key
            ERROR: 'red',
            WARN:  'yellow',
            INFO:  'blue'
        })
    );

console.log(logHighlighter.render('[ERROR] Failed to connect\n[INFO] Retrying...'));
```

### Diff Viewer

```js
import { html, rangesForLines } from 'hitext';

const diffViewer = html()
    .addLayer(
        rangesForLines('line'),
        (content, { data, rangeText }) => {
            const firstChar = rangeText[0];
            if (firstChar === '+') return `<div class="line-added">${content}</div>`;
            if (firstChar === '-') return `<div class="line-removed">${content}</div>`;
            return `<div class="line">${content}</div>`;
        }
    );

const diff = ' unchanged\n+added line\n-removed line\n unchanged';
console.log(diffViewer.render(diff));
```

### Custom Range Generator

```js
import { html } from 'hitext';

// Generator that marks URLs
function urlRanges(document, createRange) {
    const regex = /https?:\/\/[^\s]+/g;
    let match;
    while ((match = regex.exec(document))) {
        createRange(
            match.index,
            match.index + match[0].length,
            { url: match[0] }  // Store URL in data
        );
    }
}

const linkifier = html()
    .addLayer(
        urlRanges,
        (content, { data }) => `<a href="${data.url}">${content}</a>`
    );

console.log(linkifier.render('Visit https://example.com for more info'));
// Visit <a href="https://example.com">https://example.com</a> for more info
```

### Advanced: Multi-Layer Composition

```js
import { 
    html, 
    rangesForMatch, 
    rangesForLines,
    rangesCompose,
    applyFilter,
    applyDataMap
} from 'hitext';

const advancedEditor = html()
    // Layer 1: Line numbers (only non-empty lines)
    .addLayer(
        rangesCompose(
            rangesForLines('line'),
            applyFilter((range, { rangeText }) => rangeText.trim().length > 0)
        ),
        (content, { data }) => `<div data-line="${data}">${content}</div>`
    )
    // Layer 2: Syntax highlighting
    .addLayer(
        rangesForMatch(/const|let|function|return/gi),
        (content) => `<span class="keyword">${content}</span>`
    )
    // Layer 3: Track variable usage
    .addLayer(
        rangesCompose(
            rangesForMatch(/\b\w+\b/g),
            applyDataMap((range, { document }) => ({
                name: document.slice(range.start, range.end),
                length: range.end - range.start
            }))
        ),
        (content, { data }) => `<span data-var="${data.name}">${content}</span>`
    );
```

---

## Documentation

### Core Documentation

- **[API Reference](docs/api-reference.md)** - Renderers, pipeline methods, hooks, and low-level APIs
- **[Range Functions Reference](docs/range-functions-reference.md)** - All range sources and transformers
- **[Range Functions Guidelines](docs/range-functions-guidelines.md)** - Implementation patterns and design principles
- **[TypeScript Support](docs/typescript.md)** - Type definitions and usage examples

### Quick Reference

**Renderers:**
- [string()](docs/api-reference.md#string) - Plain text
- [html()](docs/api-reference.md#html) - HTML with escaping
- [tty()](docs/api-reference.md#tty) - Terminal ANSI colors
- [dom()](docs/api-reference.md#dom) - DOM nodes
- [jsx()](docs/api-reference.md#jsx) - JSX elements

**Range Sources:**
- [rangesForMatch()](docs/range-functions-reference.md#rangesformatchpattern) - Pattern matching
- [rangesForLines()](docs/range-functions-reference.md#rangesforlinestype) - Line boundaries  
- [rangesFrom()](docs/range-functions-reference.md#rangesfrominput) - Convert data
- [rangesCompose()](docs/range-functions-reference.md#rangescomposerangeinput-transformers) - Chain transformations

**Range Transformers:**
- [applyFilter()](docs/range-functions-reference.md#applyfilterpredicate) - Conditional selection
- [applyMerge()](docs/range-functions-reference.md#applymerge) - Merge overlapping
- [applyExpandTo()](docs/range-functions-reference.md#applyexpandtoposition-lines) - Expand boundaries
- [applyInvert()](docs/range-functions-reference.md#applyinvertexact) - Negate ranges

[View all functions →](docs/range-functions-reference.md)

---

## License

MIT

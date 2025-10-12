<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)
[![Coverage Status](https://coveralls.io/repos/github/hitext/hitext/badge.svg?branch=master)](https://coveralls.io/github/hitext/hitext?branch=master)

HiText is a flexible text decoration engine that allows you to **combine multiple text decorators** (like syntax highlighters, search matches, line numbers, etc.) and output the result in any format (HTML, terminal colors, etc.). 

Instead of applying decorations directly to text (which makes combining them difficult), HiText uses a two-phase approach:
1. **Generators** analyze text and produce ranges (e.g., "characters 5-10 are a keyword")
2. **Printers** use these ranges to output decorated text in your desired format

This separation makes it trivial to combine any number of decorations without conflicts.

> **Note:** This package is ESM-only and requires Node.js 14.14.0 or higher.

<!-- TOC depthfrom:2 -->

- [Why?](#why)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Examples](#examples)
    - [Basic highlighting](#basic-highlighting)
    - [Search highlighting](#search-highlighting)
    - [Line numbers](#line-numbers)
    - [Combining decorators](#combining-decorators)
- [Setup Patterns](#setup-patterns)
- [Built-in generators](#built-in-generators)
    - [lines](#lines)
    - [lineContents](#linecontents)
    - [newlines](#newlines)
    - [matches(pattern)](#matchespattern)
- [Built-in printers](#built-in-printers)
    - [html](#html)
    - [tty](#tty)
- [API Reference](#api-reference)
- [License](#license)

<!-- /TOC -->

## Why?

**The Problem:** Imagine you want to display JavaScript code with:
- Syntax highlighting
- Search term highlighting
- Line numbers

If you apply these decorations sequentially by inserting HTML tags, each step interferes with the next. The syntax highlighter might split your search term highlighting, or line numbers might break your carefully crafted HTML structure.

**The Solution:** HiText uses a **range-based approach**:
1. Each decorator generates ranges independently (e.g., "characters 10-15 are a string", "characters 12-14 match search")
2. HiText intelligently merges overlapping ranges
3. A printer generates the final output with proper nesting

This means decorators never interfere with each other, and you can add or remove them freely.

## Features

- ✅ **Combine unlimited decorators** without conflicts
- ✅ **Format-agnostic** - Output to HTML, terminal, or create custom printers
- ✅ **Zero dependencies** (except for ANSI terminal colors)
- ✅ **TypeScript support** with full type definitions
- ✅ **Simple decorator API** - Just return ranges, HiText handles the rest
- ✅ **Smart range merging** - Proper nesting and overlap handling

## Installation

```bash
npm install hitext
```

## Quick Start

```js
import hitext from 'hitext';

// Highlight all occurrences of "world"
const highlight = hitext()
    .use(hitext.gen.matches('world'), {
        html: {
            open: () => '<mark>',
            close: () => '</mark>'
        }
    })
    .printer('html');

console.log(highlight('Hello world! Welcome to the world.'));
// Hello <mark>world</mark>! Welcome to the <mark>world</mark>.
```

## Core Concepts

### Generators

A **generator** analyzes text and produces ranges. Each range has:
- `start` - Starting position (inclusive)
- `end` - Ending position (exclusive)
- `data` - Optional metadata (like line number, token type, etc.)

```js
// Simple generator function
function highlightNumbers(source, createRange) {
    const regex = /\d+/g;
    let match;
    while (match = regex.exec(source)) {
        createRange(match.index, match.index + match[0].length);
    }
}
```

### Printers

A **printer** defines how to render ranges for a specific output format. Each printer has three hooks:

- `open(context)` - Returns the opening markup/tag for a range
- `close(context)` - Returns the closing markup/tag for a range
- `print(chunk, context)` - **Important**: Transforms/escapes text content before output

```js
const printer = {
    html: {
        open: (context) => '<span class="number">',
        close: (context) => '</span>',
        print: (chunk) => chunk
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')  // Escape HTML entities!
    }
};
```

> **Why `print` matters:** The `print` hook processes the actual text content. For HTML output, this is where you escape special characters (`<`, `>`, `&`) to prevent breaking your markup. The built-in HTML printer does this automatically.

### Pipeline

Chain decorators together to create a processing pipeline:

```js
const pipeline = hitext()
    .use(generator1, printer1)
    .use(generator2, printer2)
    .printer('html');

const result = pipeline(sourceText);
```

### Plugins

A **plugin** is an object that combines a generator with its printer configuration:

```js
const myPlugin = {
    name: 'my-plugin',           // Optional: plugin name for debugging
    ranges: generatorFunction,   // Generator function or array of ranges
    printer: {                   // Printer configuration
        html: { /* ... */ },
        tty: { /* ... */ }
    }
};
```

You can also use range tuples instead of a generator:

```js
const plugin = {
    name: 'highlight-specific',
    ranges: [[0, 5], [10, 15]],  // Array of [start, end, data?] tuples
    printer: { /* ... */ }
};
```

## Examples

### Basic highlighting

Highlight specific words or patterns:

```js
import hitext from 'hitext';

const highlighter = hitext()
    .use(hitext.gen.matches(/function|const|let|var/), {
        html: {
            open: () => '<span class="keyword">',
            close: () => '</span>'
        }
    });

console.log(highlighter.print('const x = function() {}', 'html'));
// <span class="keyword">const</span> x = <span class="keyword">function</span>() {}
```

### Search highlighting

Highlight search results in text:

```js
import hitext from 'hitext';

function createSearchHighlighter(searchTerm) {
    return hitext()
        .use(hitext.gen.matches(searchTerm), {
            html: {
                open: () => '<mark class="search-result">',
                close: () => '</mark>'
            },
            tty: ({ createStyle }) => createStyle('bgYellow', 'black')
        });
}

const highlight = createSearchHighlighter('error');
const text = 'Error: Connection error on line 42';

console.log(highlight.print(text, 'html'));
// Error: Connection <mark class="search-result">error</mark> on line 42

console.log(highlight.print(text, 'tty'));
// (Shows highlighted text in terminal with yellow background)
```

### Line numbers

Add line numbers to code:

```js
import hitext from 'hitext';

const withLineNumbers = hitext()
    .use(hitext.gen.lines, {
        html: {
            open: ({ line }) => `<div class="line" data-line="${line}">`,
            close: () => '</div>'
        }
    });

const code = 'function hello() {\n  return "world";\n}';
console.log(withLineNumbers.print(code, 'html'));
// <div class="line" data-line="1">function hello() {
// </div><div class="line" data-line="2">  return "world";
// </div><div class="line" data-line="3">}</div>
```

### Combining decorators

Combine multiple decorations seamlessly:

```js
import hitext from 'hitext';

const codeDisplay = hitext()
    // Highlight keywords
    .use(hitext.gen.matches(/function|return|const/), {
        html: {
            open: () => '<span class="keyword">',
            close: () => '</span>'
        }
    })
    // Highlight strings
    .use(hitext.gen.matches(/"[^"]*"/), {
        html: {
            open: () => '<span class="string">',
            close: () => '</span>'
        }
    })
    // Add line numbers
    .use(hitext.gen.lineContents, {
        html: {
            open: ({ line }) => `<span class="line-number">${line}</span><span class="line-content">`,
            close: () => '</span>'
        }
    })
    .printer('html');

const code = 'const greet = function() {\n  return "Hello";\n}';
console.log(codeDisplay(code));
// Properly nested HTML with keywords, strings, and line numbers all working together
```

### Custom generator

Create your own generator to highlight TODO comments:

```js
import hitext from 'hitext';

function todoGenerator(source, createRange) {
    const regex = /(TODO|FIXME|NOTE):[^\n]*/gi;
    let match;
    while (match = regex.exec(source)) {
        createRange(match.index, match.index + match[0].length, {
            type: match[1].toUpperCase()
        });
    }
}

const highlighter = hitext()
    .use(todoGenerator, {
        html: {
            open: ({ data }) => `<span class="comment ${data.type.toLowerCase()}">`,
            close: () => '</span>'
        },
        tty: ({ createStyleMap }) => createStyleMap({
            'TODO': 'yellow',
            'FIXME': 'red',
            'NOTE': 'blue'
        }, ({ data }) => data.type)
    });

const code = '// TODO: Add error handling\n// FIXME: Memory leak here\n// NOTE: Optimize later';
console.log(highlighter.print(code, 'html'));
```

## Setup Patterns

HiText supports multiple ways to set up a pipeline, giving you flexibility based on your needs.

### Pattern 1: Direct initialization with plugins array

Pass plugins directly when creating the pipeline:

```js
import hitext from 'hitext';

const pluginA = {
    name: 'keywords',
    ranges: keywordGenerator,
    printer: keywordPrinter
};

const pluginB = {
    name: 'strings',
    ranges: stringGenerator,
    printer: stringPrinter
};

// Initialize with plugins array and printer type
const pipeline = hitext([pluginA, pluginB], 'html');
const result = pipeline(sourceCode);
```

### Pattern 2: Chaining with `.use()`

Build the pipeline step by step:

```js
import hitext from 'hitext';

const pipeline = hitext()
    .use(pluginA)
    .use(pluginB)
    .printer('html');

const result = pipeline(sourceCode);
```

### Pattern 3: Using `hitext.use()` shorthand

Skip the empty initialization:

```js
import hitext from 'hitext';

const pipeline = hitext.use(pluginA)
    .use(pluginB)
    .printer('html');

const result = pipeline(sourceCode);
```

### Pattern 4: Separate generator and printer

Pass generator and printer as separate arguments:

```js
import hitext from 'hitext';

const pipeline = hitext()
    .use(generatorFunction, printerConfig)
    .use(anotherGenerator, anotherPrinter)
    .printer('html');
```

### Pattern 5: Plugin with inline configuration

Create plugins on the fly:

```js
import hitext from 'hitext';

const pipeline = hitext([
    // Plugin as array: [generator, printer]
    [myGenerator, myPrinter],
    
    // Plugin as object
    {
        name: 'inline-plugin',
        ranges: anotherGenerator,
        printer: anotherPrinter
    },
    
    // Plugin with range tuples
    {
        name: 'static-ranges',
        ranges: [[0, 10], [20, 30]],
        printer: highlightPrinter
    }
], 'html');
```

### Pattern 6: Override plugin printer

Override a plugin's default printer when using it:

```js
import hitext from 'hitext';

// Plugin with default printer
const plugin = {
    name: 'my-plugin',
    ranges: myGenerator,
    printer: {
        html: {
            open: () => '<span>',
            close: () => '</span>'
        }
    }
};

// Override the printer when using the plugin
const pipeline = hitext()
    .use(plugin, {
        html: {
            open: () => '<strong>',
            close: () => '</strong>'
        }
    })
    .printer('html');
```

### Pattern 7: Set printer later

Define the printer type after building the pipeline:

```js
import hitext from 'hitext';

// Build pipeline without specifying printer
const basePipeline = hitext([pluginA, pluginB]);

// Create variants with different printers
const htmlPipeline = basePipeline.printer('html');
const ttyPipeline = basePipeline.printer('tty');

// Or specify when calling
const result1 = basePipeline(sourceCode, 'html');
const result2 = basePipeline(sourceCode, 'tty');
```

## Built-in generators

HiText includes several built-in generators for common use cases.

### lines

Generates ranges for entire lines (including newline characters). Useful for line-based decorations where you want to include the newline in the decorated range.

```js
import hitext from 'hitext';

console.log(
    hitext()
        .use(hitext.gen.lines, {
            html: {
                open: ({ line }) => `<span title="line #${line}">`,
                close: () => '</span>'
            }
        })
        .print('foo\nbar', 'html')
);
// '<span title="line #1">foo\n</span><span title="line #2">bar</span>'
```

**Context properties:**
- `line` - Line number (1-based)
- `start`, `end` - Range boundaries
- `offset` - Current position in source
- `column` - Column number (1-based)

### lineContents

Generates ranges for line content only (excluding newline characters). Useful when you want to wrap content without including the newline.

```js
import hitext from 'hitext';

console.log(
    hitext()
        .use(hitext.gen.lineContents, {
            html: {
                open: ({ line }) => `<span title="line #${line}">`,
                close: () => '</span>'
            }
        })
        .print('foo\nbar', 'html')
);
// '<span title="line #1">foo</span>\n<span title="line #2">bar</span>'
```

### newlines

Generates ranges for newline characters only. Useful for custom newline rendering.

```js
import hitext from 'hitext';

console.log(
    hitext()
        .use(hitext.gen.newlines, {
            html: {
                open: ({ line }) => `<span title="line #${line}">`,
                close: () => '</span>'
            }
        })
        .print('foo\nbar', 'html')
);
// 'foo<span title="line #1">\n</span>bar'
```

### matches(pattern)

Generates ranges for all matches of a string or regular expression.

**Parameters:**
- `pattern` - String or RegExp to match

**String matching:**

```js
import hitext from 'hitext';

const matchPrinter = {
    html: {
        open: () => `<span class="match">`,
        close: () => '</span>'
    }
};

console.log(
    hitext()
        .use(hitext.gen.matches('world'), matchPrinter)
        .print('Hello world! Hello world!', 'html')
);
// Hello <span class="match">world</span>! Hello <span class="match">world</span>!
```

**RegExp matching:**

```js
console.log(
    hitext()
        .use(hitext.gen.matches(/\w+/), matchPrinter)
        .print('Hello world!', 'html')
);
// <span class="match">Hello</span> <span class="match">world</span>!
```

> **Note:** Regular expressions are automatically made global (the `g` flag is added if not present).

## Built-in printers

### html

The HTML printer escapes HTML entities and provides hooks for generating HTML tags.

**Printer hooks:**
- `open(context)` - Returns opening HTML tag
- `close(context)` - Returns closing HTML tag  
- `print(chunk, context)` - Optional: Transform text chunks (default: escape HTML)

**Example:**

```js
import hitext from 'hitext';

hitext()
    .use(myGenerator, {
        html: {
            open: ({ data }) => `<span class="token ${data.type}">`,
            close: () => '</span>'
        }
    })
    .printer('html');
```

**HTML entities are automatically escaped:**
```js
const result = hitext().print('<div>Hello & goodbye</div>', 'html');
// &lt;div&gt;Hello &amp; goodbye&lt;/div&gt;
```

### tty

The TTY (terminal) printer provides ANSI color styling for terminal output.

**Helper functions:**
- `createStyle(...styles)` - Creates a style from ANSI color names
- `createStyleMap(map, fetcher?)` - Creates a style map for data-driven styling

**Available colors:**
- Foreground: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, etc.
- Background: `bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`, etc.
- Modifiers: `reset`, `bold`, `dim`, `italic`, `underline`

**Simple style example:**

```js
import hitext from 'hitext';

hitext()
    .use(myGenerator, {
        tty: ({ createStyle }) => createStyle('bgWhite', 'red')
    })
    .printer('tty');
```

**Style map example (data-driven):**

```js
hitext()
    .use(myGenerator, {
        tty: ({ createStyleMap }) => createStyleMap({
            keyword: 'cyan',
            string: 'green',
            error: ['bgRed', 'white']
        })
    })
    .printer('tty');
```

**Custom data mapping:**

```js
hitext()
    .use(myGenerator, {
        tty: ({ createStyleMap }) => createStyleMap(
            {
                high: 'red',
                medium: 'yellow',
                low: 'green'
            },
            ({ data }) => data.severity  // Extract severity from range data
        )
    })
    .printer('tty');
```

## API Reference

### hitext([plugins], [printerType], [printerSet])

Creates a processing pipeline.

**Parameters:**
- `plugins` - Array of plugins (optional)
- `printerType` - Default printer type: `'html'`, `'tty'`, or custom (optional)
- `printerSet` - Custom printer set (optional)

**Returns:** Pipeline function

**Example:**
```js
const pipeline = hitext([generator1, generator2], 'html');
const result = pipeline(sourceText);
```

### pipeline(source, [printerType])

Process source text with the pipeline.

**Parameters:**
- `source` - Source text to process
- `printerType` - Override default printer type (optional)

**Returns:** Decorated string

### pipeline.use(plugin, [printer])

Add a decorator to the pipeline.

**Parameters:**
- `plugin` - Generator function, plugin object, or array of ranges
- `printer` - Printer definition (optional if plugin has `printer` property)

**Returns:** New pipeline

**Plugin formats:**
```js
// Generator function
pipeline.use((source, createRange) => { /* ... */ }, printer);

// Plugin object
pipeline.use({ 
    name: 'my-plugin',
    ranges: generatorFn,
    printer: printerDef 
});

// Array of ranges
pipeline.use([[0, 5], [10, 15]], printer);
```

### pipeline.printer(printerType)

Set the default printer type.

**Parameters:**
- `printerType` - Printer type: `'html'`, `'tty'`, or custom

**Returns:** New pipeline

### pipeline.print(source, [printerType])

Alias for calling the pipeline as a function.

### pipeline.generateRanges(source)

Generate ranges without rendering.

**Parameters:**
- `source` - Source text

**Returns:** Array of range objects

### hitext.gen

Built-in generators:
- `hitext.gen.lines` - Line ranges (including newlines)
- `hitext.gen.lineContents` - Line content ranges (excluding newlines)
- `hitext.gen.newlines` - Newline character ranges
- `hitext.gen.matches(pattern)` - Pattern match ranges

### hitext.printer

Access or create printers:
- `hitext.printer('html')` - Get pipeline with HTML printer
- `hitext.printer('tty')` - Get pipeline with TTY printer
- `hitext.printer.html` - HTML printer object
- `hitext.printer.tty` - TTY printer object

### hitext.use(plugin, [printer])

Shorthand for `hitext().use(plugin, printer)`.

## License

MIT

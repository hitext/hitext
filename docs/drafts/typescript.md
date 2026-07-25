# TypeScript Support

HiText is written in TypeScript and provides comprehensive type definitions for all APIs.

## Table of Contents

- [Exported Types](#exported-types)
- [Type Definitions](#type-definitions)
  - [Pipeline Types](#pipeline-types)
  - [Range Generation Types](#range-generation-types)
  - [Range Hooks Types](#range-hooks-types)
  - [Renderer Types](#renderer-types)
  - [Context Types](#context-types)
  - [Utility Types](#utility-types)
- [Usage Examples](#usage-examples)

---

## Exported Types

All types are exported from the main package:

```typescript
import {
    // Pipeline types (entry point)
    PipelineNode,
    PipelineLayer,
    CreateRenderHooks,
    
    // Range generation types
    Ranges,
    GenerateRanges,
    CreateRange,
    TransformRanges,
    RangeIterable,
    RangeTuple,
    RangeRecord,
    RangeOrigin,
    GeneratedRange,
    RangeMarker,
    RangesGenerator,
    
    // Range hooks types
    RangeHooks,
    RangeHooksDefinition,
    RangeHooksShortcut,
    RangeHooksFactory,
    RangeHooksMap,
    RangeHooksDefinitionMap,
    RangeHookContext,
    RangeHookContextDump,
    RangeHookOpen,
    RangeHookClose,
    RangeHookWrap,
    RangeHookText,
    RangeHookReplace,
    RangeCallableHook,
    
    // Renderer types
    RenderHooks,
    RenderBuffer,
    
    // Context types
    GenerateRangesContext,
    RangeOperationContext,
    LineBoundaries
} from 'hitext';
```

---

## Type Definitions

### Pipeline Types

Core API for creating and configuring render pipelines.

#### `PipelineNode<RenderOptions, T, R, HC>`

```typescript
interface PipelineNode<RenderOptions, T, R = T, HC = unknown> {
    render(document: string, options?: RenderOptions): R;
    ranges(document: string, options?: RenderOptions): GeneratedRange[];
    addLayer<Data = unknown>(
        ranges: Ranges<Data, RenderOptions>,
        rangeHooks: RangeHooksDefinition<Data, T, R, HC> | null,
        name?: string
    ): PipelineNode<RenderOptions, T, R, HC>;
    rangeHooksMap(): RangeHooksMap<any, T, R, HC>;
    rangeHooksDefinitionMap(): RangeHooksDefinitionMap<any, T, R, HC>;
    createRenderHooks: CreateRenderHooks<T, R, HC>;
    layers: PipelineLayer<RenderOptions, any, T, R, HC>[];
}
```

**Key: `addLayer<Data>()`** - Generic `Data` parameter types `range.data` in generators and hooks.

---

#### `PipelineLayer<RenderOptions, Data, T, R, HC>`

```typescript
type PipelineLayer<RenderOptions, Data = unknown, T = unknown, R = T, HC = unknown> = {
    name?: string;
    marker: RangeMarker;
    ranges: Ranges<Data, RenderOptions>;
    rangeHooks?: RangeHooksDefinition<Data, T, R, HC> | null;
};
```

---

#### `CreateRenderHooks<T, R, HC>`

```typescript
type CreateRenderHooks<T, R, HC> = () => Partial<RenderHooks<T, R, HC>>;
```

---

### Range Generation Types

Types for creating and transforming ranges.

#### `Ranges<Data, RenderOptions>`

```typescript
type Ranges<Data = unknown, RenderOptions = unknown> =
    | RangeIterable<Data>
    | GenerateRanges<Data, RenderOptions>;
```

Accepts iterables (arrays) or generator functions.

---

#### `GenerateRanges<Data, RenderOptions>`

```typescript
type GenerateRanges<Data = unknown, RenderOptions = unknown> = (
    document: string,
    createRange: CreateRange<Data>,
    context?: GenerateRangesContext<Data, RenderOptions>
) => void;
```

---

#### `CreateRange<Data>`

```typescript
type CreateRange<Data = unknown> = (
    start: number,
    end: number,
    data?: Data,
    origin?: RangeOrigin<Data>
) => void;
```

---

#### `TransformRanges<Data, RenderOptions>`

```typescript
type TransformRanges<Data = unknown, RenderOptions = unknown> = (
    input: Ranges<Data, RenderOptions>
) => GenerateRanges<Data, RenderOptions>;
```

---

#### `RangeIterable<Data>`

```typescript
type RangeIterable<Data> = Iterable<RangeTuple<Data> | RangeRecord<Data>>;
```

---

#### `RangeTuple<Data>`

```typescript
type RangeTuple<Data = unknown> = [
    start: number,
    end: number,
    data?: Data,
    origin?: RangeOrigin<Data>
];
```

---

#### `RangeRecord<Data>`

```typescript
type RangeRecord<Data = unknown> = {
    start: number;
    end: number;
    data?: Data;
    origin?: RangeOrigin<Data>;
};
```

Normalized form used in `context.range` and `pipeline.ranges()` results.

---

#### `RangeOrigin<Data>`

```typescript
type RangeOrigin<Data> = RangeRecord<Data> | RangeRecord<Data>[];
```

---

#### `GeneratedRange<Data>`

```typescript
interface GeneratedRange<Data = unknown> {
    type: RangeMarker;
    start: number;
    end: number;
    data?: Data;
    origin?: RangeRecord<Data> | RangeRecord<Data>[];
}
```

---

#### `RangeMarker`

```typescript
type RangeMarker = symbol | string | number;
```

---

#### `RangesGenerator<Data, RenderOptions>`

```typescript
type RangesGenerator<Data, RenderOptions> =
    (document: string, renderOptions?: RenderOptions) => Ranges<Data, RenderOptions>;
```

---

### Range Hooks Types

Types for defining rendering behavior.

#### `RangeHooksDefinition<Data, T, R, HC>`

```typescript
type RangeHooksDefinition<Data = unknown, T, R = T, HC = unknown> =
    | Partial<RangeHooks<Data, T, R>>
    | RangeHooksShortcut<Data, T, R>
    | RangeHooksFactory<Data, T, R, HC>;
```

Accepts: hooks object, wrap function shortcut, or factory.

---

#### `RangeHooks<Data, T, R>`

```typescript
interface RangeHooks<Data = unknown, T, R = T> {
    open: RangeHookOpen<Data, T, R> | null;
    close: RangeHookClose<Data, T, R> | null;
    wrap: RangeHookWrap<Data, T, R> | null;
    text: RangeHookText<Data, T, R> | null;
    replace: RangeHookReplace<Data, T, R> | null;
    break: boolean;
}
```

---

#### `RangeHookOpen<Data, T, R>`, `RangeHookClose<Data, T, R>`

```typescript
type RangeHookOpen<Data, T, R = T> = (
    context: RangeHookContext<Data, T, R>
) => T | R | string | null | undefined;

type RangeHookClose<Data, T, R = T> = (
    context: RangeHookContext<Data, T, R>
) => T | R | string | null | undefined;
```

---

#### `RangeHookWrap<Data, T, R>`

```typescript
type RangeHookWrap<Data, T, R = T> = (
    content: T | R,
    context: RangeHookContext<Data, T, R>
) => T | R | string | null | undefined;
```

---

#### `RangeHookText<Data, T, R>`

```typescript
type RangeHookText<Data, T, R = T> = (
    documentChunk: string,
    context: RangeHookContext<Data, T, R>
) => T | R | string | null | undefined;
```

---

#### `RangeHookReplace<Data, T, R>`

```typescript
type RangeHookReplace<Data, T, R = T> = (
    context: RangeHookContext<Data, T, R>
) => T | R | string | null | undefined;
```

---

#### `RangeHookContext<Data, T, R>`

```typescript
type RangeHookContext<Data = unknown, T = unknown, R = T> = {
    hook: RangeCallableHook;
    document: string;
    lines: LineBoundaries;
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    rangeIndex: number;
    rangeText: string;
    range: GeneratedRange<Data>;
    data: Data;
    createBuffer(): RenderBuffer<T, R>;
    dump(): RangeHookContextDump<Data>;
}
```

See [API Reference - Hook Context](api-reference.md#hook-context) for field details.

---

#### `RangeHookContextDump<Data>`

```typescript
type RangeHookContextDump<Data> = Omit<RangeHookContext<Data>, 'lines' | 'dump' | 'createBuffer'>;
```

---

#### `RangeCallableHook`

```typescript
type RangeCallableHook = 'open' | 'close' | 'wrap' | 'text' | 'replace';
```

---

#### `RangeHooksShortcut<Data, T, R>`

```typescript
type RangeHooksShortcut<Data = unknown, T, R = T> =
    Exclude<RangeHookWrap<Data, T, R>, undefined | null>;
```

---

#### `RangeHooksFactory<Data, T, R, HC>`

```typescript
type RangeHooksFactory<Data = unknown, T, R = T, HC = unknown> = {
    createRangeHooks: (createRangeHooksContext: HC) =>
        | Partial<RangeHooks<Data, T, R>>
        | RangeHooksShortcut<Data, T, R>
        | null
        | undefined;
};
```

---

#### `RangeHooksMap<Data, T, R>`, `RangeHooksDefinitionMap<Data, T, R, HC>`

```typescript
type RangeHooksMap<Data, T, R = T> = Record<
    RangeMarker,
    RangeHooks<Data, T, R>
>;

type RangeHooksDefinitionMap<Data, T, R = T, HC = unknown> = Record<
    RangeMarker,
    RangeHooksDefinition<Data, T, R, HC> | undefined | null
>;
```

---

### Renderer Types

Types for output format handlers.

#### `RenderHooks<T, R, HC>`

```typescript
interface RenderHooks<T, R = T, HC = unknown> {
    createBuffer(): RenderBuffer<T, R>;
    open(context: RangeHookContext<any, T, R>): T | null;
    close(context: RangeHookContext<any, T, R>): T | null;
    text: RangeHookText<any, T, R> | null;
    rangeHooksContext?: HC;
}
```

---

#### `RenderBuffer<T, R>`

```typescript
interface RenderBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}
```

---

### Context Types

Context objects passed to generators, hooks, and operations.

#### `GenerateRangesContext<Data, RenderOptions>`

```typescript
type GenerateRangesContext<Data, RenderOptions> = {
    renderOptions?: RenderOptions;
    marker?: RangeMarker;
    ranges?: GeneratedRange<Data>[];
    rangesByMarker?: Record<RangeMarker, GeneratedRange<Data>[]>;
    rangesByName?: Record<string, GeneratedRange<Data>[]>;
    lines?: LineBoundaries;
}
```

See [API Reference - Generation Context](api-reference.md#generation-context).

---

#### `RangeOperationContext<RenderOptions>`

```typescript
interface RangeOperationContext<RenderOptions = any> {
    document: string;
    lines: LineBoundaries;
    renderOptions?: RenderOptions;
    ranges: Array<RangeRecord<any>>;
}
```

See [API Reference - Operation Context](api-reference.md#operation-context).

---

### Utility Types

#### `LineBoundaries`

```typescript
interface LineBoundaries {
    // Position queries
    getLine(offset: number, lines?: number): number;
    getColumn(offset: number, lines?: number): number;
    getOffset(line: number, column?: number): number;
    
    // Line boundaries
    getLineStart(offset: number, lines?: number): number;
    getLineEnd(offset: number, lines?: number): number;
    getLineContentEnd(offset: number, lines?: number): number;
    
    // Boundary checks
    isLineStart(offset: number): boolean;
    isLineEnd(offset: number): boolean;
    isLineContentEnd(offset: number): boolean;
    
    // Line content
    getNewlineText(offset: number, lines?: number): string;
    getLineText(offset: number, lines?: number): string;
    getLineContentText(offset: number, lines?: number): string;
    
    // Document info
    getLastLine(): number;
    getLinesNumber(): number;
    getMaxLineEnd(fromLine?: number, toLine?: number): number;
    getMaxLineContentEnd(fromLine?: number, toLine?: number): number;
    
    // Line comparison
    getLineDiff(offset1: number, offset2: number): number;
    isSameLine(offset1: number, offset2: number): boolean;
}
```

- All line numbers are 1-based, offsets are 0-based
- `lines` parameter navigates forward (+) or backward (-) from current position
- Line end includes newline, content end excludes newline

See [API Reference - LineBoundaries](api-reference.md#lineboundaries).

---

## Usage Examples

### Typed Pipeline with Multiple Layers

```typescript
import { html, PipelineNode } from 'hitext';

interface MyRenderOptions {
    theme: 'light' | 'dark';
}

interface TokenData {
    type: 'keyword' | 'string';
}

interface DiagnosticData {
    severity: 'error' | 'warning';
    message: string;
}

const pipeline: PipelineNode<MyRenderOptions> = html<MyRenderOptions>()
    .addLayer<TokenData>(
        (document, createRange, context) => {
            createRange(0, 5, { type: 'keyword' });
        },
        {
            wrap: (content, context) => {
                // context.data is TokenData
                return `<span class="token-${context.data.type}">${content}</span>`;
            }
        }
    )
    .addLayer<DiagnosticData>(
        (document, createRange) => {
            createRange(10, 15, { severity: 'error', message: 'Undefined variable' });
        },
        {
            wrap: (content, context) => {
                // context.data is DiagnosticData
                const { severity, message } = context.data;
                return `<span class="diagnostic ${severity}" title="${message}">${content}</span>`;
            }
        }
    );

const result = pipeline.render('const x = y;', { theme: 'dark' });
```

---

### Typed Generator

```typescript
import { GenerateRanges } from 'hitext';

interface TokenData {
    type: string;
    value: string;
}

const tokenGenerator: GenerateRanges<TokenData> = (document, createRange, context) => {
    const keywords = ['const', 'let', 'var'];
    keywords.forEach(keyword => {
        let pos = 0;
        while ((pos = document.indexOf(keyword, pos)) !== -1) {
            createRange(pos, pos + keyword.length, {
                type: 'keyword',
                value: keyword
            });
            pos++;
        }
    });
};
```

---

### Reusable Typed Hooks

```typescript
import { RangeHooks, RangeHookContext } from 'hitext';

interface DiagnosticData {
    severity: 'error' | 'warning';
    message: string;
    code?: string;
}

const diagnosticHooks: Partial<RangeHooks<DiagnosticData, string>> = {
    wrap: (content: string, context: RangeHookContext<DiagnosticData, string>) => {
        const { severity, message, code } = context.data;
        const title = code ? `[${code}] ${message}` : message;
        return `<span class="diagnostic-${severity}" title="${title}">${content}</span>`;
    }
};

// Reuse across pipelines
const p1 = html().addLayer<DiagnosticData>(ranges, diagnosticHooks);
const p2 = string().addLayer<DiagnosticData>(ranges, diagnosticHooks);
```

---

### Typed Transformer

```typescript
import { TransformRanges, Ranges } from 'hitext';

interface InputData {
    match: string;
}

interface OutputData {
    match: string;
    length: number;
}

const enrichData: TransformRanges<InputData, OutputData> = (input: Ranges<InputData>) => {
    return (document, createRange, context) => {
        if (typeof input === 'function') {
            input(document, (start, end, data, origin) => {
                if (data) {
                    createRange(start, end, {
                        match: data.match,
                        length: data.match.length
                    }, origin);
                }
            }, context);
        }
    };
};
```

---

### Accessing Previous Layer Ranges

```typescript
import { GenerateRanges, GeneratedRange } from 'hitext';

interface KeywordData {
    keyword: string;
}

interface UsageData {
    keyword: string;
    count: number;
}

const keywordGenerator: GenerateRanges<KeywordData> = (document, createRange) => {
    ['const', 'let'].forEach(keyword => {
        let pos = 0;
        while ((pos = document.indexOf(keyword, pos)) !== -1) {
            createRange(pos, pos + keyword.length, { keyword });
            pos++;
        }
    });
};

const usageGenerator: GenerateRanges<UsageData> = (document, createRange, context) => {
    const keywordRanges = context.rangesByName?.['keywords'] as GeneratedRange<KeywordData>[] ?? [];
    
    const counts = new Map<string, number>();
    keywordRanges.forEach(range => {
        const kw = range.data?.keyword;
        if (kw) counts.set(kw, (counts.get(kw) ?? 0) + 1);
    });
    
    keywordRanges.forEach(range => {
        if (range.data) {
            createRange(range.start, range.end, {
                keyword: range.data.keyword,
                count: counts.get(range.data.keyword) ?? 0
            });
        }
    });
};

const pipeline = html()
    .addLayer<KeywordData>(keywordGenerator, null, 'keywords')
    .addLayer<UsageData>(usageGenerator, {
        wrap: (content, context) => {
            return `<span data-count="${context.data.count}">${content}</span>`;
        }
    });
```

---

### Working with LineBoundaries

```typescript
import { GenerateRanges } from 'hitext';

interface LineData {
    lineNumber: number;
    isEmpty: boolean;
}

const lineGenerator: GenerateRanges<LineData> = (document, createRange, context) => {
    const lines = context.lines!;
    const lastLine = lines.getLastLine();
    
    for (let lineNum = 1; lineNum <= lastLine; lineNum++) {
        const start = lines.getOffset(lineNum);
        const end = lines.getLineContentEnd(start);
        const lineText = lines.getLineContentText(start);
        
        createRange(start, end, {
            lineNumber: lineNum,
            isEmpty: lineText.trim().length === 0
        });
    }
};
```

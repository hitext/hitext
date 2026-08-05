//
// Pipeline
//

export type CreateRenderHooks<T, R, HC> = () => Partial<RenderHooks<T, R, HC>>;
export type PipelineLayer<RenderOptions, Data = unknown, T = unknown, R = T, HC = unknown> = {
    name?: string;
    marker: SpanMarker;
    spans: SpansSource<Data, RenderOptions>;
    spanHooks?: SpanHooksDefinition<Data, T, R, HC> | null;
};
export interface PipelineNode<RenderOptions, T, R = T, HC = unknown> {
    createRenderHooks: CreateRenderHooks<T, R, HC>;
    layers: PipelineLayer<RenderOptions, any, T, R, HC>[];
    addLayer<D = unknown>(
        spans: SpansSource<D, RenderOptions>,
        spanHooks: SpanHooksDefinition<D, T, R, HC> | null,
        name?: string
    ): PipelineNode<RenderOptions, T, R, HC>;
    spans(document: string, options?: RenderOptions): GeneratedSpan[];
    spanHooksMap(): SpanHooksMap<any, T, R>;
    spanHooksDefinitionMap(): SpanHooksDefinitionMap<any, T, R, HC>;
    render(document: string, options?: RenderOptions): R;
}

//
// Spans
//

// input
export type SpansSource<Data = unknown, RenderOptions = unknown> =
    | SpansIterable<Data>
    | GenerateSpans<Data, RenderOptions>;
export type SpansIterable<Data> = Iterable<SpanTuple<Data> | SpanRecord<Data>>;
export type SpanOrigin<Data> = SpanRecord<Data> | SpanRecord<Data>[];
export type SpanTuple<Data = unknown> = [start: number, end: number, data?: Data, origin?: SpanOrigin<Data>];
export type SpanRecord<Data = unknown> = { start: number, end: number, data?: Data, origin?: SpanOrigin<Data> };
export type CreateSpan<Data = unknown> = (start: number, end: number, data?: Data, origin?: SpanOrigin<Data>) => void;
export type TransformSpans<Data = unknown, RenderOptions = unknown> = (
    input: SpansSource<Data, RenderOptions>
) => GenerateSpans<Data, RenderOptions>;
export type GenerateSpans<Data = unknown, RenderOptions = unknown> = (
    document: string,
    createSpan: CreateSpan<Data>,
    context?: GenerateSpansContext<Data, RenderOptions>
) => void;
export type GenerateSpansContext<Data, RenderOptions> = {
    renderOptions?: RenderOptions;
    marker?: SpanMarker;
    spans?: GeneratedSpan<Data>[];
    spansByMarker?: Record<SpanMarker, GeneratedSpan<Data>[]>;
    spansByName?: Record<string, GeneratedSpan<Data>[]>;
    lines?: LineBoundaries;
}
export type SpansSourceFactory<Data, RenderOptions> =
    (document: string, renderOptions?: RenderOptions) => SpansSource<Data, RenderOptions>;

// Span operation context (for filter, map, sort, etc.)
export interface SpanOperationContext<RenderOptions = any> {
    document: string;
    lines: LineBoundaries;
    renderOptions?: RenderOptions;
    spans: Array<SpanRecord<any>>;
    index: number;
}

// generated
export type SpanMarker = symbol | string | number;
export interface GeneratedSpan<Data = unknown> {
    type: SpanMarker;
    start: number;
    end: number;
    data?: Data;
    origin?: SpanRecord<Data> | SpanRecord<Data>[];
}

//
// Render span hooks
//

export type SpanHooksMap<Data, T, R = T> = Record<
    SpanMarker,
    SpanHooks<Data, T, R>
>;
export type SpanHooksDefinitionMap<Data, T, R = T, HC = unknown> = Record<
    SpanMarker,
    SpanHooksDefinition<Data, T, R, HC> | undefined | null
>;
export type SpanHooksDefinition<Data = unknown, T = unknown, R = T, HC = unknown> =
    | Partial<SpanHooks<Data, T, R>>
    | SpanHooksShortcut<Data, T, R>
    | SpanHooksFactory<Data, T, R, HC>;
export type SpanHooksShortcut<Data = unknown, T = unknown, R = T> =
    Exclude<SpanHookWrap<Data, T, R>, undefined | null>;
export type SpanHooksFactory<Data = unknown, T = unknown, R = T, HC = unknown> = {
    createSpanHooks: (createSpanHooksContext: HC) =>
        | Partial<SpanHooks<Data, T, R>>
        | SpanHooksShortcut<Data, T, R>
        | null
        | undefined;
};

export type SpanCallableHook = 'open' | 'close' | 'wrap' | 'text' | 'replace';
export interface SpanHooks<Data = unknown, T = unknown, R = T> {
    open: SpanHookOpen<Data, T, R> | null;
    close: SpanHookClose<Data, T, R> | null;
    wrap: SpanHookWrap<Data, T, R> | null;
    text: SpanHookText<Data, T, R> | null;
    replace: SpanHookReplace<Data, T, R> | null;
    break: boolean;
}

export type SpanHookOpen<Data, T, R = T> = (
    context: SpanHookContext<Data, T, R>
) => T | R | string | null | undefined;
export type SpanHookClose<Data, T, R = T> = (
    context: SpanHookContext<Data, T, R>
) => T | R | string | null | undefined;
export type SpanHookWrap<Data, T, R = T> = (
    content: T | R,
    context: SpanHookContext<Data, T, R>
) => T | R | string | null | undefined;
export type SpanHookText<Data, T, R = T> = (
    documentChunk: string,
    context: SpanHookContext<Data, T, R>
) => T | R | string | null | undefined;
export type SpanHookReplace<Data, T, R = T> = (
    context: SpanHookContext<Data, T, R>
) => T | R | string | null | undefined;

export type SpanHookContextDump<T> = Omit<SpanHookContext<T>, 'lines' | 'dump' | 'createBuffer'>;
export type SpanHookContext<Data = unknown, T = unknown, R = T> = {
    hook: SpanCallableHook;
    document: string;
    lines: LineBoundaries;
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    spanIndex: number;
    spanText: string;
    span: GeneratedSpan<Data>;
    data: Data;
    createBuffer(): RenderBuffer<T, R>;
    dump(): SpanHookContextDump<Data>;
}

//
// Render hooks
//

export interface RenderHooks<T, R = T, HC = unknown> {
    createBuffer(): RenderBuffer<T, R>;

    open(context: SpanHookContext<any, T, R>): T | null;
    close(context: SpanHookContext<any, T, R>): T | null;
    text: SpanHookText<any, T, R> | null;

    spanHooksContext?: HC;
}
export interface RenderBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}

/**
 * Interface for working with line boundaries in a document string.
 */
export interface LineBoundaries {
    /**
     * Get the line number (1-based) for a given offset in the document.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based line number containing the offset.
     */
    getLine(offset: number, lines?: number): number;

    /**
     * Get the column number (1-based) for a given offset in the document.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based column position within the line.
     */
    getColumn(offset: number, lines?: number): number;

    /**
     * Get the offset for a given line and column (both 1-based).
     * Returns the offset in the document string.
     * If line is out of bounds, clamps to valid range.
     * If column is out of bounds for the line, clamps to line length.
     */
    getOffset(line: number, column?: number): number;

    /**
     * Get the line start offset for a given offset in the document.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line starts.
     */
    getLineStart(offset: number, lines?: number): number;

    /**
     * Get the line end offset for a given offset in the document.
     * Returns offset after the newline character(s) (includes newline).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line ends.
     */
    getLineEnd(offset: number, lines?: number): number;

    /**
     * Get the line content end offset for a given offset in the document.
     * Returns offset before the newline character(s) (content only).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line content ends.
     */
    getLineContentEnd(offset: number, lines?: number): number;

    /**
     * Check if the given offset is at the start of a line.
     * Returns true if offset equals the line start position.
     */
    isLineStart(offset: number): boolean;

    /**
     * Check if the given offset is at the end of a line (after newline).
     * Returns true if offset equals the line end position (includes newline).
     */
    isLineEnd(offset: number): boolean;

    /**
     * Check if the given offset is at the content end of a line (before newline).
     * Returns true if offset equals the line content end position (excludes newline).
     */
    isLineContentEnd(offset: number): boolean;

    /**
     * Get the newline character(s) for a line at the given offset.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the newline sequence (\n, \r\n, \r) or empty string if no newline.
     */
    getNewlineText(offset: number, lines?: number): string;

    /**
     * Get the full text of a line at the given offset (includes newline).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the line text including trailing newline characters.
     */
    getLineText(offset: number, lines?: number): string;

    /**
     * Get the content text of a line at the given offset (excludes newline).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the line content text without trailing newline characters.
     */
    getLineContentText(offset: number, lines?: number): string;

    /**
     * Get the number of the last line in the document (1-based).
     * Returns the total line count.
     */
    getLastLine(): number;

    /**
     * Get the total number of lines in the document.
     * Same as getLastLine() but more semantically named.
     */
    getLinesNumber(): number;

    /**
     * Get the maximum line end offset in the range from fromLine to toLine (inclusive).
     * If fromLine is omitted, starts from line 1.
     * If toLine is omitted, ends at the last line.
     * Returns the offset where the last line in range ends.
     */
    getMaxLineEnd(fromLine?: number, toLine?: number): number;

    /**
     * Get the maximum line content end offset in the range from fromLine to toLine (inclusive).
     * If fromLine is omitted, starts from line 1.
     * If toLine is omitted, ends at the last line.
     * Returns the offset where the last line content in range ends (excludes newline).
     */
    getMaxLineContentEnd(fromLine?: number, toLine?: number): number;

    /**
     * Get the line difference between two offsets.
     * Returns positive if offset2 is on a later line, negative if earlier, 0 if same line.
     */
    getLineDiff(offset1: number, offset2: number): number;

    /**
     * Check if two offsets are on the same line.
     * Returns true if both offsets are on the same line number.
     */
    isSameLine(offset1: number, offset2: number): boolean;
}

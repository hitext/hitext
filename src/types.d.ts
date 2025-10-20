//
// Pipeline
//

export type CreateRenderHooks<T, R, HC> = () => Partial<RenderHooks<T, R, HC>>;
export type PipelineLayer<RenderOptions, Data = unknown, T = unknown, R = T, HC = unknown> = {
    name?: string;
    marker: RangeMarker;
    ranges: Ranges<Data, RenderOptions>;
    rangeHooks?: RangeHooksDefinition<Data, T, R, HC> | null;
};
export interface PipelineNode<RenderOptions, T, R = T, HC = unknown> {
    createRenderHooks: CreateRenderHooks;
    layers: PipelineLayer<RenderOptions, any, T, R, HC>[];
    addLayer<D = unknown>(
        ranges: Ranges<D, RenderOptions>,
        rangeHooks: RangeHooksDefinition<D, T, R, HC> | null,
        name?: string
    ): PipelineNode<RenderOptions, T, R, HC>;
    ranges(source: string, options?: RenderOptions): GeneratedRange[];
    rangeHooksMap(): RangeHooksMap<any, T, R, HC>;
    rangeHooksDefinitionMap(): RangeHooksDefinitionMap<any, T, R, HC>;
    render(source: string, options?: RenderOptions): R;
}

//
// Ranges
//

// input
export type Ranges<Data = unknown, RenderOptions = unknown> =
    | RangeIterable<Data>
    | GenerateRanges<Data, RenderOptions>;
export type RangeIterable<Data> = Iterable<RangeTuple<Data> | RangeRecord<Data>>;
export type RangeOrigin<Data> = RangeRecord<Data> | RangeRecord<Data>[];
export type RangeTuple<Data = unknown> = [start: number, end: number, data?: Data, origin?: RangeOrigin<Data>];
export type RangeRecord<Data = unknown> = { start: number, end: number, data?: Data, origin?: RangeOrigin<Data> };
export type CreateRange<Data = unknown> = (start: number, end: number, data?: Data, origin?: RangeOrigin<Data>) => void;
export type GenerateRanges<Data = unknown, RenderOptions = unknown> = (
    source: string,
    createRange: CreateRange<Data>,
    context?: GenerateRangesContext<Data, RenderOptions>
) => void;
export type GenerateRangesContext<Data, RenderOptions> = {
    renderOptions?: RenderOptions,
    marker?: RangeMarker,
    ranges?: GeneratedRange<Data>[];
    rangesByMarker?: Record<RangeMarker, GeneratedRange<Data>[]>;
    rangesByName?: Record<string, GeneratedRange<Data>[]>;
    lines?: LineBoundaries;
}
export type RangesGenerator<Data, RenderOptions> =
    (source: string, renderOptions?: RenderOptions) => Ranges<Data, RenderOptions>;

// generated
export type RangeMarker = symbol | string | number;
export interface GeneratedRange<Data = unknown> {
    type: RangeMarker;
    start: number;
    end: number;
    data?: Data;
    origin?: RangeRecord<Data> | RangeRecord<Data>[];
}

//
// Render range hooks
//

export type RangeHooksMap<Data, T, R = T> = Record<
    RangeMarker,
    RangeHooks<Data, T, R>
>;
export type RangeHooksDefinitionMap<Data, T, R = T, HC = unknown> = Record<
    RangeMarker,
    RangeHooksDefinition<Data, T, R, HC> | undefined | null
>;
export type RangeHooksDefinition<Data = unknown, T, R = T, HC = unknown> =
    | Partial<RangeHooks<Data, T, R>>
    | RangeHooksShortcut<Data, T, R>
    | RangeHooksFactory<Data, T, R, HC>;
export type RangeHooksShortcut<Data = unknown, T, R = T> =
    Exclude<RangeHookWrap<Data, T, R>, undefined | null>;
export type RangeHooksFactory<Data = unknown, T, R = T, HC = unknown> = {
    createRangeHooks: (createRangeHooksContext: HC) =>
        | Partial<RangeHooks<Data, T, R>>
        | RangeHooksShortcut<Data, T, R>
        | null
        | undefined;
};

export type RangeCallableHook = 'open' | 'close' | 'wrap' | 'text' | 'replace';
export interface RangeHooks<Data = unknown, T, R = T> {
    open: RangeHookOpen<Data, T> | null;
    close: RangeHookClose<Data, T> | null;
    wrap: RangeHookWrap<Data, T, R> | null;
    text: RangeHookText<Data, T> | null;
    replace: RangeHookReplace<Data, T> | null;
    break: boolean;
}

export type RangeHookOpen<Data, T> = (
    context: RangeHookContext<Data>
) => T | string | null | undefined;
export type RangeHookClose<Data, T> = (
    context: RangeHookContext<Data>
) => T | string | null | undefined;
export type RangeHookWrap<Data, T, R = T> = (
    content: T | R,
    context: RangeHookContext<Data>
) => T | R | string | null | undefined;
export type RangeHookText<Data, T> = (
    sourceChunk: string,
    context: RangeHookContext<Data>
) => T | string | null | undefined;
export type RangeHookReplace<Data, T> = (
    context: RangeHookContext<Data>
) => T | string | null | undefined;

export type RangeHookContextDump<T> = Omit<RangeHookContext<T>, 'dump' | 'lines'>;
export type RangeHookContext<T = unknown> = {
    hook: RangeCallableHook;
    source: string;
    lines: LineBoundaries;
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    rangeIndex: number;
    rangeText: string;
    range: GeneratedRange<T>;
    data: T;
    dump(): RangeHookContextDump<T>;
}

//
// Render hooks
//

export interface RenderHooks<T, R = T, HC = unknown> {
    createBuffer(): RenderBuffer<T, R>;

    open(context: RangeHookContext): T | null;
    close(context: RangeHookContext): T | null;
    text: RangeHookText<any, T> | null;

    rangeHooksContext?: HC;
}
export interface RenderBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}

/**
 * Interface for working with line boundaries in a source string.
 */
export interface LineBoundaries {
    /**
     * Get the line number (1-based) for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based line number containing the offset.
     */
    getLine(offset: number, lines?: number): number;

    /**
     * Get the column number (1-based) for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based column position within the line.
     */
    getColumn(offset: number, lines?: number): number;

    /**
     * Get the offset for a given line and column (both 1-based).
     * Returns the offset in the source string.
     * If line is out of bounds, clamps to valid range.
     * If column is out of bounds for the line, clamps to line length.
     */
    getOffset(line: number, column?: number): number;

    /**
     * Get the line start offset for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line starts.
     */
    getLineStart(offset: number, lines?: number): number;

    /**
     * Get the line end offset for a given offset in the source.
     * Returns offset after the newline character(s) (includes newline).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line ends.
     */
    getLineEnd(offset: number, lines?: number): number;

    /**
     * Get the line content end offset for a given offset in the source.
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
    getLineNewline(offset: number, lines?: number): string;
}

//
// Pipeline
//

export type CreateRenderHooks<T, R, HC> = () => Partial<RenderHooks<T, R, HC>>;
export type PipelineLayer<RenderOptions, Data = unknown, T = unknown, R = T, HC = unknown> = {
    marker: RangeMarker;
    ranges: Ranges<Data, RenderOptions>;
    rangeHooks?: RangeHooksDefinition<Data, T, R, HC> | null;
};
export interface PipelineNode<RenderOptions, T, R = T, HC = unknown> {
    createRenderHooks: CreateRenderHooks;
    layers: PipelineLayer<RenderOptions, any, T, R, HC>[];
    addLayer<D = unknown>(
        ranges: Ranges<D, RenderOptions>,
        rangeHooks: RangeHooksDefinition<D, T, R, HC> | null
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
    | RangeList<Data>
    | GenerateRanges<Data, RenderOptions>;
export type RangeList<Data> = Array<RangeTuple<Data> | RangeRecord<Data>>;
export type RangeTuple<Data = unknown> = [start: number, end: number, data?: Data];
export type RangeRecord<Data = unknown> = { start: number, end: number, data?: Data };
export type CreateRange<Data = unknown> = (start: number, end: number, data?: Data) => void;
export type GenerateRanges<Data = unknown, RenderOptions = unknown> = (
    source: string,
    createRange: CreateRange<Data>,
    renderOptions?: RenderOptions
) => void;

// generated
export type RangeMarker = symbol | string | number;
export interface GeneratedRange<Data = unknown> {
    type: RangeMarker;
    start: number;
    end: number;
    data?: Data;
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

export type RangeHookContextDump<T> = Omit<RangeHookContext<T>, 'dump'>;
export type RangeHookContext<T = unknown> = {
    source: string;
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

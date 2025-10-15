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
    | Array<RangeTuple<Data> | Range<Data>>
    | GenerateRanges<Data, RenderOptions>;
export type RangeTuple<Data = unknown> = [start: number, end: number, data?: Data];
export type Range<Data = unknown> = { start: number, end: number, data?: Data };
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

export type RangeHooksMap<Data, T, R = T, HC = unknown> = Record<
    RangeMarker,
    Partial<RangeHooks<Data, T, R, HC>>
>;
export type RangeHooksNormalizedMap<Data, T, R = T, HC = unknown> = Record<
    RangeMarker,
    RangeHooks<Data, T, R, HC>
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
    Exclude<RangeHooks<Data, T, R>['content'], undefined | null>;
export type RangeHooksFactory<Data = unknown, T, R = T, HC = unknown> = {
    createRangeHooks: (createRangeHooksContext: HC) =>
        | Partial<RangeHooks<Data, T, R>>
        | RangeHooksShortcut<Data, T, R>
        | null
        | undefined;
};

export interface RangeHooks<Data = unknown, T, R = T> {
    open: (context: RangeHookContext<Data>) => T | string | null;
    close: (context: RangeHookContext<Data>) => T | string | null;
    content: ((content: T | R, context: RangeHookContext<Data>) => T | string | null) | null | undefined;
    text: (sourceChunk: string, context: RangeHookContext<Data>) => string | null;
}
export type RangeHookContextDump<T> = Omit<RangeHookContext<T>, 'dump'>;
export interface RangeHookContext<T = unknown> {
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    data: T;
    dump(): RangeHookContextDump<T>;
}

//
// Render hooks
//

export interface RenderHooks<T, R = T, HC = unknown> {
    createBuffer(): RenderBuffer<T, R>;
    text(sourceChunk: string): string;
    open(context: RangeHookContext): T | null;
    close(context: RangeHookContext): T | null;

    rangeHooksContext?: HC;
}
export interface RenderBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}

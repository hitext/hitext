//
// Pipeline
//

export type CreateRenderHooks = () => Partial<RenderHooks<any, any>>;
export type PipelineLayer = {
    marker: RangeMarker;
    generate: GenerateRanges<any, any>;
    rangeHooks: LayerRangeHooks<any, any, any, any>;
};

// Range hooks factory wrapper
export type RangeHooksFactory<Data = unknown, T = unknown, R = T, HC = unknown> = {
    createRangeHooks: (context: HC) => Partial<RangeHooks<Data, T, R>>;
};

// Range hooks configuration - can be hooks object, function shortcut, or factory
export type LayerRangeHooks<Data = unknown, T = unknown, R = T, HC = unknown> =
    | Partial<RangeHooks<Data, T, R>>
    | RangeHooks<Data, T, R>['range']
    | RangeHooksFactory<Data, T, R, HC>;

export interface PipelineNode<RenderOptions, T, R = T, HC = unknown> {
    createRenderHooks: CreateRenderHooks;
    layers: PipelineLayer[];
    addLayer<D = unknown>(
        ranges: Ranges<D, RenderOptions>,
        rangeHooks: LayerRangeHooks<D, T, R, HC>
    ): PipelineNode<RenderOptions, T, R, HC>;
    ranges(source: string, options?: RenderOptions): GeneratedRange[];
    rangeHooksMap(): Record<RangeMarker, Partial<RangeHooks<any, T, R>>>;
    render(source: string, options?: RenderOptions): R;
}
export interface Generator<Data = unknown, RenderOptions = unknown> {
    marker: RangeMarker,
    generate: GenerateRanges<Data, RenderOptions>
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
// Render
//

export interface RangeHooks<Data = unknown, T, R = T> {
    open: (context: RangeHookContext<Data>) => T | string | null;
    close: (context: RangeHookContext<Data>) => T | string | null;
    range: ((content: T | R, context: RangeHookContext<Data>) => T | string | null) | null;
    text: (sourceChunk: string, context: RangeHookContext<Data>) => string | null;
}
export interface RangeHookContext<T = unknown> {
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    data: T;
}

export interface RenderBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}
export interface RenderHooks<T, R = T, HC = unknown> {
    createBuffer(): RenderBuffer<T, R>;
    text(sourceChunk: string): string;
    open(context: RangeHookContext): T | null;
    close(context: RangeHookContext): T | null;

    rangeHooksContext?: HC;
}

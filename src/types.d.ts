//
// Pipeline
//

export type CreateRenderHooks = () => Partial<RenderHooks<any, any>>;
export type PipelineLayer = {
    marker: RangeMarker;
    generate: GenerateRanges<any, any>;
    rangeHooks: Partial<RangeHooks>;
};
export interface PipelineNode<RenderOptions, T, R = T, HC = unknown> {
    createRenderHooks: CreateRenderHooks;
    layers: PipelineLayer[];
    addLayer<D = unknown>(
        ranges: Ranges<D, RenderOptions>,
        rangeHooks: Partial<RangeHooks<D, T, R>> | ((context: HC) => Partial<RangeHooks<D, T, R>>)
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
    data: Data | undefined;
}

//
// Render
//

export interface RangeHooks<Data = unknown, T, R = T> {
    open: (context: RangeHookContext<Data>) => T | string | null;
    close: (context: RangeHookContext<Data>) => T | string | null;
    node: ((content: T | R, context: RangeHookContext<Data>) => T | string | null) | null;
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

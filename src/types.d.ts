//
// Pipeline
//

export type CreateRenderHooks = () => Partial<RenderHooks<any, any>>;
export type PipelineLayer = {
    marker: RangeMarker;
    generate: GenerateRanges<any, any>;
    rangeHooks: Partial<RangeHooks>;
};
export interface PipelineNode<LayerOptions, T, R = T, HC = unknown> {
    createRenderHooks: CreateRenderHooks;
    layers: PipelineLayer[];
    addLayer<D = unknown>(
        ranges: Ranges<D, LayerOptions>,
        rangeHooks: Partial<RangeHooks<D, T, R>> | ((context: HC) => Partial<RangeHooks<D, T, R>>)
    ): PipelineNode<LayerOptions, T, R, HC>;
    ranges(source: string, options?: LayerOptions): GeneratedRange[];
    rangeHooksMap(): Record<RangeMarker, Partial<RangeHooks<any, T, R>>>;
    render(source: string, options?: LayerOptions): R;
}
export interface Generator<Data = unknown, LayerOptions = unknown> {
    marker: RangeMarker,
    generate: GenerateRanges<Data, LayerOptions>
}

//
// Ranges
//

// input
export type Ranges<Data = unknown, LayerOptions = unknown> =
    | Array<RangeTuple<Data> | Range<Data>>
    | GenerateRanges<Data, LayerOptions>;
export type RangeTuple<Data = unknown> = [start: number, end: number, data?: Data];
export type Range<Data = unknown> = { start: number, end: number, data?: Data };
export type CreateRange<Data = unknown> = (start: number, end: number, data?: Data) => void;
export type GenerateRanges<Data = unknown, LayerOptions = unknown> = (
    source: string,
    createRange: CreateRange<Data>,
    layerOptions?: LayerOptions
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
    open: (context: RangeHookContext<Data>) => T | string;
    close: (context: RangeHookContext<Data>) => T | string;
    node: ((content: T | R, context: RangeHookContext<Data>) => T | string) | null;
    text: (chunk: string, context: RangeHookContext<Data>) => string | null;
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
    open(context: RangeHookContext): T;
    close(context: RangeHookContext): T;

    rangeHooksContext?: HC;
}

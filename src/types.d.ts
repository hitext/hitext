//
// Pipeline
//

export interface PipelineNodeState {
    createPrintHooks: () => Partial<PrintHooks<any, any>>;
    layers: Array<{
        marker: RangeMarker;
        generate: GenerateRanges<any, any>;
        hooks: Partial<RangeHooks>;
    }>;
}
export interface PipelineNode<LayerOptions, T, R = T, HC = unknown> {
    addLayer<D = unknown>(
        ranges: Ranges<D, LayerOptions>,
        hooks: Partial<RangeHooks<D, T, R>> | ((context: HC) => Partial<RangeHooks<D, T, R>>)
    ): PipelineNode<LayerOptions, T, R, HC>;
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
export type CreateRange<Data> = (start: number, end: number, data?: Data) => void;
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
// Printer
//

export interface PrinterHookContext<T = unknown> {
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    data: T;
}

export interface RangeHooks<Data = unknown, T, R = T> {
    open: (context: PrinterHookContext<Data>) => T | string;
    close: (context: PrinterHookContext<Data>) => T | string;
    node: ((content: T | R, context: PrinterHookContext<Data>) => T | string) | null;
    text: (chunk: string, context: PrinterHookContext<Data>) => string | null;
}

export interface PrinterBuffer<ReturnValue, ChunkValue = ReturnValue> {
    append(child: ChunkValue | PrinterBuffer<ReturnValue, ChunkValue>): void;
    emit(): ReturnValue;
}

export interface Printer<
    ReturnValue = string,
    ChunkValue = ReturnValue,
    Buffer extends PrinterBuffer<ReturnValue, ChunkValue> = PrinterBuffer<ReturnValue, ChunkValue>,
    Options = any
> {
    // Buffer management
    createBuffer?(options: Options): Buffer;

    // Lifecycle hooks
    open?(options: Options): ChunkValue;
    close?(options: Options): ChunkValue;
    text?(chunk: string): ChunkValue;
}

export interface PrintBuffer<T, R = T> {
    append(child: string | T | R): void;
    emit(): R;
}

export interface PrintHooks<T, R = T, HC = unknown> {
    createBuffer(): PrintBuffer<T, R>;
    text(sourceChunk: string): string;
    open(context: PrinterHookContext): T;
    close(context: PrinterHookContext): T;

    rangeHooksContext?: HC;
}

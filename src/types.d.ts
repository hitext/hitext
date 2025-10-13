export type Marker = symbol | string | number;
export type createRange = (start: number, end: number, data?: any) => void;
export type GenerateRanges = (source: string, createRange: createRange) => void;
export type RangeTuple = [start: number, end: number, data?: any];
export interface Range {
    type: Marker;
    start: number;
    end: number;
    data?: any;
}
export interface Generator {
    marker: Marker,
    generate: GenerateRanges
}

export type PluginRef = Plugin | GenerateRanges | [Plugin, PrinterSetExtension];
export interface Plugin {
    name: string | undefined;
    ranges: GenerateRanges | RangeTuple[];
    printer?: PrinterSetExtension;
}

export interface PrinterHook<Context = PrinterHookContext> {
    // New API: content callback model
    node?: (context: Context) => any;
    before?: (context: Context) => any;
    after?: (context: Context) => any;
    text?: (chunk: string, context: Context) => any;

    // Legacy API (deprecated but functional)
    open?: (context: Context) => string;
    close?: (context: Context) => string;
    print?: (chunk: string, context: Context) => string;
}
export interface PrinterHookContext {
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    data: any;

    // Content callback: returns rendered nested content
    // Hook calls this to get the content for this range
    content(): any;
}
export type PrinterExtension = Partial<Printer>;
export type PrinterRangeHooksMap = {
    [key: string | symbol]: PrinterHook<any>;
}
export interface Printer<T = PrinterHookContext> {
    // Output type discriminator
    outputType?: string;  // 'string' | 'node' | 'jsx' | custom

    // Root container creation
    createRoot?(): any;

    // Combine/append fragments
    append?(parent: any, child: any): any;

    // Finalize output
    finalize?(accumulated: any): any;

    // New API: before/after (replace open/close)
    before?(context: T): any;
    after?(context: T): any;

    // New API: text transformation (replaces print)
    text?(chunk: string, context: T): any;

    // Legacy API (deprecated but functional)
    open?(context: T): string;
    close?(context: T): string;
    print?(chunk: string, context: T): string;

    createContext?(): any;
    fork: (extension?: PrinterExtension) => Printer;
    ranges: PrinterRangeHooksMap;
    createHook: (fn: Function) => PrinterHook<any>;
}
export type PrinterSetExtension = {
    [key: string]: PrinterExtension;
}
export type PrinterSet = {
    [key: string]: Printer;
} & {
    fork(extension: PrinterSetExtension): PrinterSet;
};

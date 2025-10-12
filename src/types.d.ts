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
}
export type PrinterExtension = Partial<Printer>;
export type PrinterRangeHooksMap = {
    [key: string | symbol]: PrinterHook<any>;
}
export interface Printer<T = PrinterHookContext> {
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

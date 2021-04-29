export type Marker = symbol;
export type createRange = (start: number, end: number, data?: any) => void;
export type generateRanges = (source: string, createRange: createRange) => void;
export type RangeTuple = [start: number, end: number, data?: any];
export interface Range {
    type: Marker;
    start: number;
    end: number;
    data?: any;
}
export interface Generator {
    marker: Marker,
    generate: generateRanges
}

export type PluginRef = Plugin | generateRanges | [Plugin, Printer];
export interface Plugin {
    name: string | undefined;
    ranges: generateRanges | RangeTuple[];
    printer?(): void;
}

export interface PrinterHook {
    open?: (context: PrinterHookContext) => string;
    close?: (context: PrinterHookContext) => string;
    print?: (chunk: string, context: PrinterHookContext) => string;
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
    [key: string | symbol]: PrinterHook | Function;
};
export interface Printer {
    open(context: PrinterHookContext): string;
    close(context: PrinterHookContext): string;
    print?(chunk: string, context: PrinterHookContext): string;
    createContext?(): any;
    fork: (extension?: PrinterExtension) => Printer;
    ranges: PrinterRangeHooksMap;
    createHook: (fn: Function) => PrinterHook;
}
export type PrinterSetExtension = {
    [key: string]: PrinterExtension;
}
export type PrinterSet = {
    [key: string]: Printer;
} & {
    fork(extension: PrinterSetExtension): PrinterSet; 
};

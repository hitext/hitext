export type Marker = symbol | string | number;
export type createRange<Data> = (start: number, end: number, data?: Data) => void;
export type GenerateRanges<Data = unknown> = (source: string, createRange: createRange<Data>) => void;
export type RangeTuple<Data = unknown> = [start: number, end: number, data?: Data];
export interface Range<Data = unknown> {
    type: Marker;
    start: number;
    end: number;
    data?: Data;
}
export interface Generator<Data = unknown> {
    marker: Marker,
    generate: GenerateRanges<Data>
}

export type PluginRef<Data> = Plugin<Data> | GenerateRanges<Data> | [Plugin<Data>, PluginPrinterSet<Data>];
export type PluginPrinterSet<Data = unknown, Ctx = PrinterHookContext<Data>> = {
    [key: string]: PrinterHook<Ctx>;
}
export interface Plugin<Data = unknown> {
    name: string | undefined;
    ranges: GenerateRanges<Data> | RangeTuple<Data>[];
    printer?: PluginPrinterSet<Data>;
}

export interface PrinterHook<Context extends PrinterHookContext> {
    before?: (context: Context) => any;
    after?: (context: Context) => any;
    node?: (content: any, context: Context) => any;
    text?: (chunk: string, context: Context) => any;
}
export interface PrinterHookContext<T = unknown> {
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    data: T;
}
export type PrinterExtension<Ctx extends PrinterHookContext, HookFn extends Function> = Partial<Printer<Ctx, HookFn>>;
export type PrinterRangeHooksMap<Ctx extends PrinterHookContext, HookFn extends Function> = {
    [key: string | symbol]: PrinterHook<Ctx> | HookFn;
}
export interface Printer<Ctx = PrinterHookContext, HookFn extends Function = Function> {
    createContext?(options?: any): any;
    createBuffer?(context: Ctx): any;
    open?(context: Ctx): any;
    append?(buffer: any, child: any): void;
    text?(chunk: string, context: Ctx): any;
    close?(context: Ctx): any;
    emit?(buffer: any, context: Ctx): any;

    createHook: (fn: HookFn) => PrinterHook<Ctx>;
    hooks: PrinterRangeHooksMap<Ctx, HookFn>;

    fork: (extension?: PrinterExtension<Ctx, HookFn>) => Printer<Ctx, HookFn>;
}
export type PrinterSetExtension<T = unknown> = {
    [key: string]: PrinterExtension<T>;
}
export type PrinterSetDict = {
    [key: string]: Printer<any, any>;
}
export type PrinterSet = PrinterSetDict & {
    fork?(extension: PrinterSetExtension): PrinterSet;
};

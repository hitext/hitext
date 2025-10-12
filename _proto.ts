type Context = any;
type PrintRange<T> = {
    offset: number;
    line: number;
    column: number;
    start: number;
    end: number;
    data: T;
};
type Layer<T> = {
    ranges;
    openRange?(range: Context): T;
    closeRange?(range: Context): T;
    chunk?(chunk: string): T | string;
};
type Printer<State, T, Options = {}> = {
    start(options: Options): State;
    finish(state: State, options: Options): unknown;

    openRange(state: State, x: T | undefined, range: Context);
    closeRange(state: State, x: T | undefined, range: Context);
    chunk(state: State, chunk: T | string | undefined);

    layers: Layer<T>[];

    fork(layer: Layer<T>): Printer<State, T, Options>;
};

const BasePrinter: Printer<{ buffer: string }, string> = {
    layers: [],

    start() {
        return { buffer: '' };
    },
    finish(state) {
        return state.buffer;
    },
    openRange(state, x) {
        state.buffer += x;
    },
    closeRange(state, x) {
        state.buffer += x;
    },
    chunk(state, chunk) {
        state.buffer += chunk;
    }
};

const HtmlPrinter: typeof BasePrinter = {
    ...BasePrinter,
    chunk(state, chunk) {
        state.buffer += chunk.replace(/&/g, '&amp;');
    }
};

interface BasePrinter<State, Ret> {
    start(): State;
    finish(state: State): Ret;
};

const PrinterX: BasePrinter<{ buffer: number }, number> = {
    start() {
        return { buffer: 123 };
    },
    finish(state) {
        return state.buffer;
    },
    create() {
        
    }
}

function pipeline<X extends BasePrinter>(printer: X) {
    const state = printer.start({ });

    return {
        print() {
            return printer.finish(state);
        }
    };
}

pipeline(PrinterX).print()

// type TestX<Options> = {
//     prepare(options: Options): T;
//     run(value: T): void;
// }

// type Test<Options, U> = (U extends { prepare(): infer X } ? {
//     prepare(): X;
//     run(value: X): void;
// } : never)


// const TTT: Test<{ foo: number }> = {
//     prepare(options) {
//         return options.foo;
//     },
//     run(value: number) {
//         console.log(value);
//     }
// };

// const demo = TTT.prepare({ foo: 123 });

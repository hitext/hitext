import { deepStrictEqual, strictEqual } from 'assert';
import { spansCompose, generateSpans } from '../../src/index.js';
import type { GenerateSpans, SpansSource } from '../../src/types.js';
import { startEndData } from '../utils.js';

describe('spansCompose', () => {
    describe('Basic composition', () => {
        it('should work with no transformers (pass-through)', () => {
            const document = 'Hello world';
            const spans = generateSpans(
                document,
                spansCompose([[0, 5], [6, 11]])
            );

            deepStrictEqual(startEndData(spans), [
                [0, 5, undefined],
                [6, 11, undefined]
            ]);
        });

        it('should compose single transformer', () => {
            const document = 'test';
            const doubleSpans = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    const spans: Array<[number, number]> = [];
                    if (typeof input === 'function') {
                        input(src, (s, e) => spans.push([s, e]), ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                spans.push([span[0], span[1]]);
                            }
                        }
                    }
                    // Double each span
                    for (const [s, e] of spans) {
                        create(s, e);
                        create(s, e);
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [[0, 2]],
                    doubleSpans
                )
            );

            strictEqual(spans.length, 2);
            deepStrictEqual(startEndData(spans), [
                [0, 2, undefined],
                [0, 2, undefined]
            ]);
        });

        it('should compose multiple transformers', () => {
            const document = 'test';

            // Transformer that doubles spans
            const doubleSpans = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    const spans: Array<[number, number]> = [];
                    if (typeof input === 'function') {
                        input(src, (s, e) => spans.push([s, e]), ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                spans.push([span[0], span[1]]);
                            }
                        }
                    }
                    for (const [s, e] of spans) {
                        create(s, e);
                        create(s, e);
                    }
                };
            };

            // Transformer that adds 1 to each position
            const shiftSpans = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => create(s + 1, e + 1, d, o), ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                create(span[0] + 1, span[1] + 1);
                            }
                        }
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [[0, 2]],
                    doubleSpans,
                    shiftSpans
                )
            );

            strictEqual(spans.length, 2);
            deepStrictEqual(startEndData(spans), [
                [1, 3, undefined],
                [1, 3, undefined]
            ]);
        });
    });

    describe('Execution order', () => {
        it('should execute transformers left-to-right', () => {
            const document = 'test';
            const executionOrder: string[] = [];

            const transformer1 = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    executionOrder.push('T1-start');
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => {
                            executionOrder.push('T1-create');
                            create(s, e, d, o);
                        }, ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                executionOrder.push('T1-create');
                                create(span[0], span[1]);
                            }
                        }
                    }
                    executionOrder.push('T1-end');
                };
            };

            const transformer2 = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    executionOrder.push('T2-start');
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => {
                            executionOrder.push('T2-create');
                            create(s, e, d, o);
                        }, ctx);
                    }
                    executionOrder.push('T2-end');
                };
            };

            generateSpans(
                document,
                spansCompose(
                    [[0, 2]],
                    transformer1,
                    transformer2
                )
            );

            // T2 should wrap T1, so T2 starts first, then T1 executes and creates,
            // T2 receives the create callback, T1 ends, then T2 ends
            deepStrictEqual(executionOrder, [
                'T2-start',
                'T1-start',
                'T1-create',
                'T2-create',
                'T1-end',
                'T2-end'
            ]);
        });

        it('should pass data through transformer chain', () => {
            const document = 'test';

            const addData = (value: string) => (input: SpansSource<any, any>): GenerateSpans<string, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e) => create(s, e, value), ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                create(span[0], span[1], value);
                            }
                        }
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [[0, 2]],
                    addData('first'),
                    addData('second') // This will overwrite
                )
            );

            strictEqual(spans.length, 1);
            strictEqual(spans[0].data, 'second');
        });
    });

    describe('Empty inputs', () => {
        it('should handle empty document spans', () => {
            const document = 'test';
            const identity = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, create, ctx);
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [],
                    identity,
                    identity
                )
            );

            deepStrictEqual(spans, []);
        });

        it('should handle transformer that produces no spans', () => {
            const document = 'test';
            const filterAll = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    // Don't call create at all
                    if (typeof input === 'function') {
                        input(src, () => {}, ctx);
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [[0, 2], [2, 4]],
                    filterAll
                )
            );

            deepStrictEqual(spans, []);
        });
    });

    describe('Type safety', () => {
        it('should preserve type information through composition', () => {
            const document = 'test';

            const toNumber = (input: SpansSource<string, any>): GenerateSpans<number, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => create(s, e, 42, o as any), ctx as any);
                    } else {
                        for (const span of input) {
                            if (!Array.isArray(span)) {
                                create(span.start, span.end, 42);
                            }
                        }
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [{ start: 0, end: 2, data: 'str' }],
                    toNumber
                )
            );

            strictEqual(spans.length, 1);
            strictEqual(typeof spans[0].data, 'number');
            strictEqual(spans[0].data, 42);
        });
    });

    describe('Nested composition', () => {
        it('should support nested spansCompose calls', () => {
            const document = 'test';

            const double = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => {
                            create(s, e, d, o);
                            create(s, e, d, o);
                        }, ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                create(span[0], span[1], span[2]);
                                create(span[0], span[1], span[2]);
                            } else {
                                create(span.start, span.end, span.data);
                                create(span.start, span.end, span.data);
                            }
                        }
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    spansCompose(
                        [[0, 2]],
                        double  // 2 spans
                    ),
                    double  // 4 spans
                )
            );

            strictEqual(spans.length, 4);
        });

        it('should handle deeply nested composition', () => {
            const document = 'test';

            const increment = (input: SpansSource<number, any>): GenerateSpans<number, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => create(s, e, (d || 0) + 1, o), ctx);
                    } else {
                        for (const span of input) {
                            const data = Array.isArray(span) ? span[2] : span.data;
                            const start = Array.isArray(span) ? span[0] : span.start;
                            const end = Array.isArray(span) ? span[1] : span.end;
                            create(start, end, (data || 0) + 1);
                        }
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    spansCompose(
                        spansCompose(
                            [{ start: 0, end: 2, data: 0 }],
                            increment  // data = 1
                        ),
                        increment  // data = 2
                    ),
                    increment  // data = 3
                )
            );

            strictEqual(spans[0].data, 3);
        });
    });

    describe('Integration with span generators', () => {
        it('should work with array input', () => {
            const document = 'test';
            const identity = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, create, ctx);
                    } else {
                        for (const span of input) {
                            if (Array.isArray(span)) {
                                create(span[0], span[1], span[2]);
                            } else {
                                create(span.start, span.end, span.data);
                            }
                        }
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    [[0, 2], [2, 4]],
                    identity
                )
            );

            strictEqual(spans.length, 2);
        });

        it('should work with generator function input', () => {
            const document = 'test';
            const genFunc: GenerateSpans<string, any> = (src, create) => {
                create(0, 2, 'a');
                create(2, 4, 'b');
            };

            const identity = (input: SpansSource<any, any>): GenerateSpans<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, create, ctx);
                    }
                };
            };

            const spans = generateSpans(
                document,
                spansCompose(
                    genFunc,
                    identity
                )
            );

            strictEqual(spans.length, 2);
            strictEqual(spans[0].data, 'a');
            strictEqual(spans[1].data, 'b');
        });
    });
});

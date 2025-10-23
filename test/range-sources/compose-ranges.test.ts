import { deepStrictEqual, strictEqual } from 'assert';
import { composeRanges, generateRanges } from '../../src/index.js';
import type { GenerateRanges, Ranges } from '../../src/types.js';
import { startEndData } from '../utils.js';

describe('composeRanges', () => {
    describe('Basic composition', () => {
        it('should work with no transformers (pass-through)', () => {
            const document = 'Hello world';
            const ranges = generateRanges(
                document,
                composeRanges([[0, 5], [6, 11]])
            );

            deepStrictEqual(startEndData(ranges), [
                [0, 5, undefined],
                [6, 11, undefined]
            ]);
        });

        it('should compose single transformer', () => {
            const document = 'test';
            const doubleRanges = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    const ranges: Array<[number, number]> = [];
                    if (typeof input === 'function') {
                        input(src, (s, e) => ranges.push([s, e]), ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                ranges.push([range[0], range[1]]);
                            }
                        }
                    }
                    // Double each range
                    for (const [s, e] of ranges) {
                        create(s, e);
                        create(s, e);
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [[0, 2]],
                    doubleRanges
                )
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(startEndData(ranges), [
                [0, 2, undefined],
                [0, 2, undefined]
            ]);
        });

        it('should compose multiple transformers', () => {
            const document = 'test';

            // Transformer that doubles ranges
            const doubleRanges = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    const ranges: Array<[number, number]> = [];
                    if (typeof input === 'function') {
                        input(src, (s, e) => ranges.push([s, e]), ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                ranges.push([range[0], range[1]]);
                            }
                        }
                    }
                    for (const [s, e] of ranges) {
                        create(s, e);
                        create(s, e);
                    }
                };
            };

            // Transformer that adds 1 to each position
            const shiftRanges = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => create(s + 1, e + 1, d, o), ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                create(range[0] + 1, range[1] + 1);
                            }
                        }
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [[0, 2]],
                    doubleRanges,
                    shiftRanges
                )
            );

            strictEqual(ranges.length, 2);
            deepStrictEqual(startEndData(ranges), [
                [1, 3, undefined],
                [1, 3, undefined]
            ]);
        });
    });

    describe('Execution order', () => {
        it('should execute transformers left-to-right', () => {
            const document = 'test';
            const executionOrder: string[] = [];

            const transformer1 = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    executionOrder.push('T1-start');
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => {
                            executionOrder.push('T1-create');
                            create(s, e, d, o);
                        }, ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                executionOrder.push('T1-create');
                                create(range[0], range[1]);
                            }
                        }
                    }
                    executionOrder.push('T1-end');
                };
            };

            const transformer2 = (input: Ranges<any, any>): GenerateRanges<any, any> => {
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

            generateRanges(
                document,
                composeRanges(
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

            const addData = (value: string) => (input: Ranges<any, any>): GenerateRanges<string, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e) => create(s, e, value), ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                create(range[0], range[1], value);
                            }
                        }
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [[0, 2]],
                    addData('first'),
                    addData('second') // This will overwrite
                )
            );

            strictEqual(ranges.length, 1);
            strictEqual(ranges[0].data, 'second');
        });
    });

    describe('Empty inputs', () => {
        it('should handle empty document ranges', () => {
            const document = 'test';
            const identity = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, create, ctx);
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [],
                    identity,
                    identity
                )
            );

            deepStrictEqual(ranges, []);
        });

        it('should handle transformer that produces no ranges', () => {
            const document = 'test';
            const filterAll = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    // Don't call create at all
                    if (typeof input === 'function') {
                        input(src, () => {}, ctx);
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [[0, 2], [2, 4]],
                    filterAll
                )
            );

            deepStrictEqual(ranges, []);
        });
    });

    describe('Type safety', () => {
        it('should preserve type information through composition', () => {
            const document = 'test';

            const toNumber = (input: Ranges<string, any>): GenerateRanges<number, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => create(s, e, 42, o as any), ctx as any);
                    } else {
                        for (const range of input) {
                            if (!Array.isArray(range)) {
                                create(range.start, range.end, 42);
                            }
                        }
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [{ start: 0, end: 2, data: 'str' }],
                    toNumber
                )
            );

            strictEqual(ranges.length, 1);
            strictEqual(typeof ranges[0].data, 'number');
            strictEqual(ranges[0].data, 42);
        });
    });

    describe('Nested composition', () => {
        it('should support nested composeRanges calls', () => {
            const document = 'test';

            const double = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => {
                            create(s, e, d, o);
                            create(s, e, d, o);
                        }, ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                create(range[0], range[1], range[2]);
                                create(range[0], range[1], range[2]);
                            } else {
                                create(range.start, range.end, range.data);
                                create(range.start, range.end, range.data);
                            }
                        }
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    composeRanges(
                        [[0, 2]],
                        double  // 2 ranges
                    ),
                    double  // 4 ranges
                )
            );

            strictEqual(ranges.length, 4);
        });

        it('should handle deeply nested composition', () => {
            const document = 'test';

            const increment = (input: Ranges<number, any>): GenerateRanges<number, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, (s, e, d, o) => create(s, e, (d || 0) + 1, o), ctx);
                    } else {
                        for (const range of input) {
                            const data = Array.isArray(range) ? range[2] : range.data;
                            const start = Array.isArray(range) ? range[0] : range.start;
                            const end = Array.isArray(range) ? range[1] : range.end;
                            create(start, end, (data || 0) + 1);
                        }
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    composeRanges(
                        composeRanges(
                            [{ start: 0, end: 2, data: 0 }],
                            increment  // data = 1
                        ),
                        increment  // data = 2
                    ),
                    increment  // data = 3
                )
            );

            strictEqual(ranges[0].data, 3);
        });
    });

    describe('Integration with range generators', () => {
        it('should work with array input', () => {
            const document = 'test';
            const identity = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, create, ctx);
                    } else {
                        for (const range of input) {
                            if (Array.isArray(range)) {
                                create(range[0], range[1], range[2]);
                            } else {
                                create(range.start, range.end, range.data);
                            }
                        }
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    [[0, 2], [2, 4]],
                    identity
                )
            );

            strictEqual(ranges.length, 2);
        });

        it('should work with generator function input', () => {
            const document = 'test';
            const genFunc: GenerateRanges<string, any> = (src, create) => {
                create(0, 2, 'a');
                create(2, 4, 'b');
            };

            const identity = (input: Ranges<any, any>): GenerateRanges<any, any> => {
                return (src, create, ctx) => {
                    if (typeof input === 'function') {
                        input(src, create, ctx);
                    }
                };
            };

            const ranges = generateRanges(
                document,
                composeRanges(
                    genFunc,
                    identity
                )
            );

            strictEqual(ranges.length, 2);
            strictEqual(ranges[0].data, 'a');
            strictEqual(ranges[1].data, 'b');
        });
    });
});

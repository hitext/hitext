import { strictEqual, deepStrictEqual } from 'assert';
import { render } from '../src/index.js';
import type { GeneratedRange, RangeHookContext } from '../src/types.js';

describe('render / context', () => {
    const source = 'Hello, World!';
    interface TestData {
        idx: number;
        test?: TestData;
    }
    const ranges = [[1, 5], [1, 2], [4, 8], [3, 5]].map(([start, end], idx) => {
        const range: GeneratedRange<TestData> = {
            type: 'test',
            start,
            end,
            data: {
                idx
            }
        };
        range.data!.test = range.data;
        return range;
    });

    it('range data', () => {
        const actual = render(source, ranges, {
            test: {
                open({ data }: RangeHookContext<TestData>) {
                    return '[' + (data.test === data ? 'ok' : 'fail') + ']';
                },
                close({ data }: RangeHookContext<TestData>) {
                    return '[/' + (data.test === data ? 'ok' : 'fail') + ']';
                }
            }
        });

        strictEqual(
            actual,
            'H[ok][ok]e[/ok]l[ok]l[/ok][/ok][ok][ok][ok]o[/ok][/ok], W[/ok]orld!'
        );
    });

    it('range start/end', () => {
        const actual = render(source, ranges, {
            test: {
                open({ data, offset, range }: RangeHookContext<TestData>) {
                    return '[' + (range.start === offset ? 'start' : 'start-continue') + '-' + data.idx + ']';
                },
                close({ data, offset, range }: RangeHookContext<TestData>) {
                    return '[/' + (range.end === offset ? 'end' : 'temp-end') + '-' + data.idx + ']';
                }
            }
        });

        strictEqual(
            actual,
            'H[start-0][start-1]e[/end-1]l[start-3]l[/temp-end-3][/temp-end-0][start-2][start-continue-0][start-continue-3]o[/end-3][/end-0], W[/end-2]orld!'
        );
    });

    it('location', () => {
        const source = '1\n2\r3\r\n4';
        const ranges = source.split('').map((c, idx) => ({
            type: 'test' as const,
            start: idx,
            end: idx + 1,
            data: {}
        }));
        const actual = render(source, ranges, {
            test: {
                open({ offset, line, column }: RangeHookContext<Record<string, never>>) {
                    return '[' + [offset, line, column].join(':') + ']';
                },
                close({ offset, line, column }: RangeHookContext<Record<string, never>>) {
                    return '[/' + [offset, line, column].join(':') + ']';
                }
            }
        });

        strictEqual(actual, [
            '[0:1:1]1[/1:1:2][1:1:2]\n' +
            '[/2:2:1][2:2:1]2[/3:2:2][3:2:2]\r' +
            '[/4:3:1][4:3:1]3[/5:3:2][5:3:2]\r[/6:3:3][6:3:3]\n' +
            '[/7:4:1][7:4:1]4[/8:4:2]'
        ].join(''));
    });

    describe('segment start/end', () => {
        const captureSegmentHooks = () => {
            const segments: Array<{ hook: string; id: string; start: number; end: number; offset: number }> = [];
            return {
                segments,
                hooks: {
                    test: {
                        open({ start, end, offset, data }: RangeHookContext<any>) {
                            segments.push({ hook: 'open   ', id: data.id, start, end, offset });
                        },
                        close({ start, end, offset, data }: RangeHookContext<any>) {
                            segments.push({ hook: 'close  ', id: data.id, start, end, offset });
                        },
                        content(content: any, { start, end, offset, data }: RangeHookContext<any>) {
                            segments.push({ hook: 'content', id: data.id, start, end, offset });
                            return content;
                        }
                    }
                }
            };
        };

        it('should provide correct segment boundaries for simple range', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } }
            ];

            const { segments, hooks } = captureSegmentHooks();
            render(source, ranges, hooks);

            deepStrictEqual(segments, [
                { hook: 'open   ', id: 'a', start: 1, end: 8, offset: 1 },
                { hook: 'content', id: 'a', start: 1, end: 8, offset: 8 },
                { hook: 'close  ', id: 'a', start: 1, end: 8, offset: 8 }
            ]);
        });

        it('should provide correct segment boundaries for nested ranges', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } },
                { type: 'test' as const, start: 3, end: 4, data: { id: 'b' } }
            ];

            const { segments, hooks } = captureSegmentHooks();
            render(source, ranges, hooks);

            deepStrictEqual(segments, [
                { hook: 'open   ', id: 'a', start: 1, end: 8, offset: 1 },
                { hook: 'open   ', id: 'b', start: 3, end: 4, offset: 3 },
                { hook: 'content', id: 'b', start: 3, end: 4, offset: 4 },
                { hook: 'close  ', id: 'b', start: 3, end: 4, offset: 4 },
                { hook: 'content', id: 'a', start: 1, end: 8, offset: 8 },
                { hook: 'close  ', id: 'a', start: 1, end: 8, offset: 8 }
            ]);
        });

        it('should provide correct segment boundaries for interrupted range', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } },
                { type: 'test' as const, start: 5, end: 10, data: { id: 'b' } }
            ];

            const { segments, hooks } = captureSegmentHooks();
            render(source, ranges, hooks);

            deepStrictEqual(segments, [
                // First segment of 'a': [1, 5]
                { hook: 'open   ', id: 'a', start: 1, end: 5, offset: 1 },
                { hook: 'content', id: 'a', start: 1, end: 5, offset: 5 },
                { hook: 'close  ', id: 'a', start: 1, end: 5, offset: 5 },
                // Full segment of 'b': [5, 10]
                { hook: 'open   ', id: 'b', start: 5, end: 10, offset: 5 },
                // Second segment of 'a': [5, 8]
                { hook: 'open   ', id: 'a', start: 5, end: 8, offset: 5 },
                { hook: 'content', id: 'a', start: 5, end: 8, offset: 8 },
                { hook: 'close  ', id: 'a', start: 5, end: 8, offset: 8 },
                { hook: 'content', id: 'b', start: 5, end: 10, offset: 10 },
                { hook: 'close  ', id: 'b', start: 5, end: 10, offset: 10 }
            ]);
        });

        it('should provide correct segment boundaries for complex nested and interrupted ranges', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } },
                { type: 'test' as const, start: 5, end: 10, data: { id: 'b' } },
                { type: 'test' as const, start: 3, end: 4, data: { id: 'c' } }
            ];

            const { segments, hooks } = captureSegmentHooks();
            render(source, ranges, hooks);

            deepStrictEqual(segments, [
                // First segment of 'a': [1, 5] (interrupted at 5 by 'b')
                { hook: 'open   ', id: 'a', start: 1, end: 5, offset: 1 },
                // Nested 'c': [3, 4] (doesn't interrupt 'a')
                { hook: 'open   ', id: 'c', start: 3, end: 4, offset: 3 },
                { hook: 'content', id: 'c', start: 3, end: 4, offset: 4 },
                { hook: 'close  ', id: 'c', start: 3, end: 4, offset: 4 },
                { hook: 'content', id: 'a', start: 1, end: 5, offset: 5 },
                { hook: 'close  ', id: 'a', start: 1, end: 5, offset: 5 },
                // Full segment of 'b': [5, 10]
                { hook: 'open   ', id: 'b', start: 5, end: 10, offset: 5 },
                // Second segment of 'a': [5, 8]
                { hook: 'open   ', id: 'a', start: 5, end: 8, offset: 5 },
                { hook: 'content', id: 'a', start: 5, end: 8, offset: 8 },
                { hook: 'close  ', id: 'a', start: 5, end: 8, offset: 8 },
                { hook: 'content', id: 'b', start: 5, end: 10, offset: 10 },
                { hook: 'close  ', id: 'b', start: 5, end: 10, offset: 10 }
            ]);
        });

        it('should handle multiple nested ranges', () => {
            const source = '0123456789';
            const ranges = [
                { type: 'test' as const, start: 0, end: 10, data: { id: 'a' } },
                { type: 'test' as const, start: 2, end: 4, data: { id: 'b' } },
                { type: 'test' as const, start: 6, end: 8, data: { id: 'c' } }
            ];

            const { segments, hooks } = captureSegmentHooks();
            render(source, ranges, hooks);

            // Note: Nested ranges don't split the content hook of the outer range.
            // The content hook for 'a' is called once at the end with the full range boundaries.
            deepStrictEqual(segments, [
                { hook: 'open   ', id: 'a', start: 0, end: 10, offset: 0 },
                { hook: 'open   ', id: 'b', start: 2, end: 4, offset: 2 },
                { hook: 'content', id: 'b', start: 2, end: 4, offset: 4 },
                { hook: 'close  ', id: 'b', start: 2, end: 4, offset: 4 },
                { hook: 'open   ', id: 'c', start: 6, end: 8, offset: 6 },
                { hook: 'content', id: 'c', start: 6, end: 8, offset: 8 },
                { hook: 'close  ', id: 'c', start: 6, end: 8, offset: 8 },
                { hook: 'content', id: 'a', start: 0, end: 10, offset: 10 },
                { hook: 'close  ', id: 'a', start: 0, end: 10, offset: 10 }
            ]);
        });

        it('should handle ranges without content hook', () => {
            const source = 'Hello';
            const ranges = [
                { type: 'test' as const, start: 1, end: 4, data: { id: 'a' } }
            ];

            const segments: Array<{ hook: string; start: number; end: number; offset: number }> = [];
            render(source, ranges, {
                test: {
                    open({ start, end, offset }) {
                        segments.push({ hook: 'open ', start, end, offset });
                    },
                    close({ start, end, offset }) {
                        segments.push({ hook: 'close', start, end, offset });
                    }
                }
            });

            deepStrictEqual(segments, [
                { hook: 'open ', start: 1, end: 4, offset: 1 },
                { hook: 'close', start: 1, end: 4, offset: 4 }
            ]);
        });
    });
});

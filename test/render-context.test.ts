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
        const source = '1\n' +
        '2\r3\r\n' +
        '4';
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

    describe('rangeIndex', () => {
        it('should provide correct rangeIndex for simple ranges', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: 'a' },
                { type: 'test' as const, start: 5, end: 12, data: 'b' }
            ];

            const segments: Array<{ hook: string; rangeIndex: number; start: number; end: number; data: string }> = [];
            render(source, ranges, {
                test: {
                    open({ rangeIndex, start, end, data }) {
                        segments.push({ hook: 'open ', rangeIndex, start, end, data });
                    },
                    close({ rangeIndex, start, end, data }) {
                        segments.push({ hook: 'close', rangeIndex, start, end, data });
                    },
                    wrap(content, { rangeIndex, start, end, data }) {
                        segments.push({ hook: 'wrap ', rangeIndex, start, end, data });
                        return content;
                    }
                }
            });

            deepStrictEqual(segments, [
                { hook: 'open ', data: 'a', rangeIndex: 0, start: 1, end: 5 },
                { hook: 'wrap ', data: 'a', rangeIndex: 0, start: 1, end: 5 },
                { hook: 'close', data: 'a', rangeIndex: 0, start: 1, end: 5 },
                { hook: 'open ', data: 'b', rangeIndex: 1, start: 5, end: 12 },
                { hook: 'open ', data: 'a', rangeIndex: 0, start: 5, end: 8 },
                { hook: 'wrap ', data: 'a', rangeIndex: 0, start: 5, end: 8 },
                { hook: 'close', data: 'a', rangeIndex: 0, start: 5, end: 8 },
                { hook: 'wrap ', data: 'b', rangeIndex: 1, start: 5, end: 12 },
                { hook: 'close', data: 'b', rangeIndex: 1, start: 5, end: 12 }
            ]);
        });
    });

    describe('segment start/end', () => {
        const renderWithBoundaries = (source: string, ranges: GeneratedRange[]) => {
            return render(source, ranges, {
                test: {
                    open: ({ start, end, data }: RangeHookContext<any>) => `<${data.id}:${start}:${end}>\n`,
                    close: ({ start, end, data }: RangeHookContext<any>) => `</${data.id}:${start}:${end}>\n`,
                    text: (text) => `${text}\n`,
                    wrap: (content: any, { start, end, data }: RangeHookContext<any>) => {
                        return `${content}<${data.id}:wrap:${start}:${end}/>\n`;
                    }
                }
            });
        };

        it('should provide correct segment boundaries for simple range', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } }
            ];

            const result = renderWithBoundaries(source, ranges);

            strictEqual(result,
                'H<a:1:8>\n' +
                'ello, W\n' +
                '<a:wrap:1:8/>\n' +
                '</a:1:8>\n' +
                'orld!'
            );
        });

        it('should provide correct segment boundaries for nested ranges', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } },
                { type: 'test' as const, start: 3, end: 4, data: { id: 'b' } }
            ];

            const result = renderWithBoundaries(source, ranges);

            strictEqual(result,
                'H<a:1:8>\n' +
                'el\n' +
                '<b:3:4>\n' +
                'l\n' +
                '<b:wrap:3:4/>\n' +
                '</b:3:4>\n' +
                'o, W\n' +
                '<a:wrap:1:8/>\n' +
                '</a:1:8>\n' +
                'orld!'
            );
        });

        it('should provide correct segment boundaries for interrupted range', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } },
                { type: 'test' as const, start: 5, end: 10, data: { id: 'b' } }
            ];

            const result = renderWithBoundaries(source, ranges);

            strictEqual(result,
                'H<a:1:5>\n' +
                'ello\n' +
                '<a:wrap:1:5/>\n' +
                '</a:1:5>\n' +
                '<b:5:10>\n' +
                '<a:5:8>\n' +
                ', W\n' +
                '<a:wrap:5:8/>\n' +
                '</a:5:8>\n' +
                'or\n' +
                '<b:wrap:5:10/>\n' +
                '</b:5:10>\n' +
                'ld!'
            );
        });

        it('should provide correct segment boundaries for complex nested and interrupted ranges', () => {
            const source = 'Hello, World!';
            const ranges = [
                { type: 'test' as const, start: 1, end: 8, data: { id: 'a' } },
                { type: 'test' as const, start: 5, end: 10, data: { id: 'b' } },
                { type: 'test' as const, start: 3, end: 4, data: { id: 'c' } }
            ];

            const result = renderWithBoundaries(source, ranges);

            strictEqual(result,
                'H<a:1:5>\n' +
                'el\n' +
                '<c:3:4>\n' +
                'l\n' +
                '<c:wrap:3:4/>\n' +
                '</c:3:4>\n' +
                'o\n' +
                '<a:wrap:1:5/>\n' +
                '</a:1:5>\n' +
                '<b:5:10>\n' +
                '<a:5:8>\n' +
                ', W\n' +
                '<a:wrap:5:8/>\n' +
                '</a:5:8>\n' +
                'or\n' +
                '<b:wrap:5:10/>\n' +
                '</b:5:10>\n' +
                'ld!'
            );
        });

        it('should handle multiple nested ranges', () => {
            const source = '0123456789';
            const ranges = [
                { type: 'test' as const, start: 0, end: 10, data: { id: 'a' } },
                { type: 'test' as const, start: 2, end: 4, data: { id: 'b' } },
                { type: 'test' as const, start: 6, end: 8, data: { id: 'c' } }
            ];

            const result = renderWithBoundaries(source, ranges);

            strictEqual(result,
                '<a:0:10>\n' +
                '01\n' +
                '<b:2:4>\n' +
                '23\n' +
                '<b:wrap:2:4/>\n' +
                '</b:2:4>\n' +
                '45\n' +
                '<c:6:8>\n' +
                '67\n' +
                '<c:wrap:6:8/>\n' +
                '</c:6:8>\n' +
                '89\n' +
                '<a:wrap:0:10/>\n' +
                '</a:0:10>\n'
            );
        });

        it('should handle ranges without content hook', () => {
            const source = 'Hello';
            const ranges = [
                { type: 'test' as const, start: 1, end: 4, data: { id: 'a' } }
            ];

            const result = render(source, ranges, {
                test: {
                    open: ({ start, end, data }: RangeHookContext<any>) => `<${data.id}:${start}:${end}>\n`,
                    close: ({ start, end, data }: RangeHookContext<any>) => `</${data.id}:${start}:${end}>\n`,
                    text: (text) => `${text}\n`
                }
            });

            strictEqual(result,
                'H<a:1:4>\n' +
                'ell\n' +
                '</a:1:4>\n' +
                'o'
            );
        });

        it('should compute correct segment end for inner range when outer range is interrupted', () => {
            const source = '0123456789ABCDEF';
            const ranges = [
                { type: 'test' as const, start: 0, end: 10, data: { id: 'outer' } },     // Outer: 0-10
                { type: 'test' as const, start: 2, end: 8, data: { id: 'inner' } },      // Inner: 2-8 (nested)
                { type: 'test' as const, start: 5, end: 16, data: { id: 'interrupt' } }  // Interrupts outer at 5
            ];

            const result = renderWithBoundaries(source, ranges);

            // The inner range [2,8] is nested inside outer[0,10].
            // When interrupt[5,16] starts, it interrupts outer, which causes inner to also be interrupted.
            // Note: inner's first segment shows end=5 in open because that's where it will actually close,
            // not end=8 (its natural end). This is correct - segment boundaries show actual rendering positions.
            strictEqual(result,
                '<outer:0:5>\n' +
                '01\n' +
                '<inner:2:5>\n' +
                '234\n' +
                '<inner:wrap:2:5/>\n' +
                '</inner:2:5>\n' +
                '<outer:wrap:0:5/>\n' +
                '</outer:0:5>\n' +
                '<interrupt:5:16>\n' +
                '<outer:5:10>\n' +
                '<inner:5:8>\n' +
                '567\n' +
                '<inner:wrap:5:8/>\n' +
                '</inner:5:8>\n' +
                '89\n' +
                '<outer:wrap:5:10/>\n' +
                '</outer:5:10>\n' +
                'ABCDEF\n' +
                '<interrupt:wrap:5:16/>\n' +
                '</interrupt:5:16>\n'
            );
        });
    });
});

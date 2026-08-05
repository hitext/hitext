import { deepStrictEqual, strictEqual } from 'assert';
import { SpanHooks, render } from '../../src/index.js';
// import type { SpanHookText } from '../src/index.js';

describe('render / text hook', () => {
    const replaceTextHook = (str: string): Partial<SpanHooks<any, any>> => ({
        text: (chunk: string) => chunk.replace(/./g, str)
    });

    it('should use span hook text method when defined', () => {
        strictEqual(
            render('1234567890', [
                { type: 'a', start: 1, end: 6 },
                { type: 'b', start: 2, end: 5 },
                { type: 'c', start: 3, end: 4 },
                { type: 'a', start: 8, end: 10 }
            ], {
                a: replaceTextHook('a'),
                b: replaceTextHook('b'),
                c: {}
            }, {
                text: (chunk: string) => chunk.replace(/./g, '_')
            }),
            '_abbba__aa'
        );
    });

    it('should use innermost span text hook when nested', () => {
        strictEqual(
            render('0123456789', [
                { type: 'outer', start: 0, end: 10 },
                { type: 'inner', start: 3, end: 7 }
            ], {
                outer: replaceTextHook('o'),
                inner: replaceTextHook('i')
            }),
            'oooiiiiooo'
        );
    });

    it('should inherit text hook from parent when child has no text hook', () => {
        strictEqual(
            render('0123456789', [
                { type: 'outer', start: 0, end: 10 },
                { type: 'inner', start: 3, end: 7 }
            ], {
                outer: replaceTextHook('x'),
                inner: {}
            }),
            'xxxxxxxxxx'
        );
    });

    it('should provide the text hook owner in context when inherited', () => {
        const outer = { type: 'outer', start: 0, end: 3, data: 'outer' };
        const inner = { type: 'inner', start: 1, end: 2, data: 'inner' };
        const contexts: Array<Record<string, unknown>> = [];

        render('abc', [outer, inner], {
            outer: {
                text(documentChunk, context) {
                    contexts.push({
                        documentChunk,
                        hook: context.hook,
                        offset: context.offset,
                        start: context.start,
                        end: context.end,
                        span: context.span,
                        data: context.data
                    });
                    return documentChunk;
                }
            },
            inner: {}
        });

        deepStrictEqual(contexts, [
            { documentChunk: 'a', hook: 'text', offset: 0, start: 0, end: 1, span: outer, data: 'outer' },
            { documentChunk: 'b', hook: 'text', offset: 1, start: 1, end: 2, span: outer, data: 'outer' },
            { documentChunk: 'c', hook: 'text', offset: 2, start: 2, end: 3, span: outer, data: 'outer' }
        ]);
    });

    it('should not ignore text hook when defined', () => {
        const defaultTextHook = replaceTextHook('x').text;
        strictEqual(
            render('0123456789AB', [
                { type: 'a', start: 2, end: 10 },
                { type: 'b', start: 4, end: 8 },
                { type: 'c', start: 5, end: 7 }
            ], {
                a: replaceTextHook('a'),
                b: { text: defaultTextHook },
                c: {}
            }, {
                text: defaultTextHook
            }),
            'xxaaxxxxaaxx'
        );
    });

    it('should use render text hook when no span text hook defined', () => {
        strictEqual(
            render('0123456789', [
                { type: 'test', start: 2, end: 5 }
            ], {
                test: {}
            }, {
                text: (chunk: string) => chunk.replace(/./g, '_')
            }),
            '__________'
        );
    });

    it('should handle multiple overlapping spans with different text hooks', () => {
        strictEqual(
            render('0123456789', [
                { type: 'a', start: 0, end: 6 },
                { type: 'b', start: 3, end: 9 },
                { type: 'c', start: 5, end: 7 }
            ], {
                a: replaceTextHook('a'),
                b: replaceTextHook('b'),
                c: replaceTextHook('c')
            }),
            'aaaaaacbb9'
        );
    });

    it('should apply text hook to empty content', () => {
        strictEqual(
            render('0123456789', [
                { type: 'test', start: 3, end: 3 }
            ], {
                test: replaceTextHook('x')
            }),
            '0123456789'
        );
    });

    it('should work with wrap hook and text hook together', () => {
        strictEqual(
            render('0123456789', [
                { type: 'test', start: 2, end: 7 }
            ], {
                test: {
                    text: (chunk: string) => chunk.replace(/./g, 'x'),
                    wrap: (content: string) => `[${content}]`
                }
            }),
            '01[xxxxx]789'
        );
    });

    it('should apply text transformation before wrap hook', () => {
        let capturedContent = '';
        render('Hello', [
            { type: 'test', start: 0, end: 5 }
        ], {
            test: {
                text: (chunk: string) => chunk.toUpperCase(),
                wrap: (content: string) => {
                    capturedContent = content;
                    return content;
                }
            }
        });

        strictEqual(capturedContent, 'HELLO');
    });

    it('should handle text hook with open/close hooks', () => {
        strictEqual(
            render('0123456789', [
                { type: 'test', start: 2, end: 7 }
            ], {
                test: {
                    text: (chunk: string) => chunk.replace(/./g, 'x'),
                    open: () => '<',
                    close: () => '>'
                }
            }),
            '01<xxxxx>789'
        );
    });

    it('should prioritize innermost text hook in deeply nested spans', () => {
        strictEqual(
            render('0123456789', [
                { type: 'level1', start: 0, end: 10 },
                { type: 'level2', start: 2, end: 8 },
                { type: 'level3', start: 4, end: 6 }
            ], {
                level1: replaceTextHook('1'),
                level2: replaceTextHook('2'),
                level3: replaceTextHook('3')
            }),
            '1122332211'
        );
    });

    it('should handle adjacent spans with different text hooks', () => {
        strictEqual(
            render('0123456789', [
                { type: 'a', start: 0, end: 3 },
                { type: 'b', start: 3, end: 6 },
                { type: 'c', start: 6, end: 10 }
            ], {
                a: replaceTextHook('a'),
                b: replaceTextHook('b'),
                c: replaceTextHook('c')
            }),
            'aaabbbcccc'
        );
    });

    it('should apply text hook to interrupted span segments', () => {
        strictEqual(
            render('0123456789AB', [
                { type: 'outer', start: 0, end: 10 },
                { type: 'interrupting', start: 4, end: 12 }
            ], {
                outer: replaceTextHook('o'),
                interrupting: replaceTextHook('i')
            }),
            'ooooooooooii'
        );
    });
});

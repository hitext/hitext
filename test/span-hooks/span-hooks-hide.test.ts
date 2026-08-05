import { strictEqual, deepStrictEqual } from 'assert';
import { StringBuffer, spanHooksHide, createLineBoundaries } from '../../src/index.js';
import type { SpanHookContext, SpanHookContextDump, SpanHooks } from '../../src/types.js';

// Helper to create minimal context for testing hooks
function createContext(
    document: string,
    start: number,
    end: number,
    forStart = true
): SpanHookContext<null, string, string> {
    const lineBoundaries = createLineBoundaries(document);
    const offset = forStart ? start : end;
    return {
        hook: 'open',
        document,
        start,
        end,
        offset,
        data: null,
        line: lineBoundaries.getLine(offset),
        column: lineBoundaries.getColumn(offset),
        lines: lineBoundaries,
        spanIndex: -1,
        spanText: document.slice(start, end),
        span: {
            type: 'test',
            start,
            end,
            data: null
        },
        createBuffer() {
            return new StringBuffer();
        },
        dump(): SpanHookContextDump<null> {
            return null as unknown as SpanHookContextDump<null>;
        }
    };
}

// Helper to test individual hook and show input/output
function testHook(
    hookFn: ((context: SpanHookContext<null, string, string>) => unknown) | null | undefined,
    document: string,
    start: number,
    end: number,
    useEndOffset = false
) {
    const context = createContext(document, start, end, !useEndOffset);
    const hookResult = (hookFn?.(context) ?? null) as string | null;

    return {
        before: document.slice(0, start),
        spanText: document.slice(start, end),
        after: document.slice(end),
        hookResult
    };
}

// Helper to apply hooks and see the resulting output
function applyReplacement(
    hooks: Partial<SpanHooks<unknown, string>>,
    document: string,
    start: number,
    end: number
) {
    // Hooks are called in order during rendering, but need different contexts:
    // - open/replace: use start offset for line/column
    // - wrap/close: use end offset for line/column

    const contextForStart = createContext(document, start, end, true);
    const contextForEnd = createContext(document, start, end, false);

    const open = hooks.open?.(contextForStart) ?? null;
    const replace = hooks.replace?.(contextForStart) ?? null;
    const close = hooks.close?.(contextForEnd) ?? null;

    // Simulate actual rendering behavior: close -> replace -> open
    const result = document.slice(0, start) +
        (close ?? '') +
        (replace ?? '') +
        (open ?? '') +
        document.slice(end);

    return {
        close,
        replace,
        open,
        spanText: document.slice(start, end),
        result
    };
}

describe('spanHooksHide', () => {
    describe('replace hook', () => {
        it('should replace span spanning 2+ lines starting at line start', () => {
            const document = 'line1\nline2\nline3\n';
            const hooks = spanHooksHide();

            const output = testHook(hooks.replace, document, 6, 18);

            deepStrictEqual(output, {
                before: 'line1\n',
                spanText: 'line2\nline3\n',
                after: '',
                hookResult: '...\n'
            });
        });

        it('should replace span spanning 2+ lines NOT at line start', () => {
            const document = '  line1\n  line2\n  line3\n';
            const hooks = spanHooksHide();

            const output = testHook(hooks.replace, document, 2, 25);

            deepStrictEqual(output, {
                before: '  ',
                spanText: 'line1\n  line2\n  line3\n',
                after: '',
                hookResult: '\n...\n'
            });
        });

        it('should replace span at document start with marker and trailing newline', () => {
            const document = 'line1\nline2\nline3\n';
            const hooks = spanHooksHide();

            const output = testHook(hooks.replace, document, 0, 6);

            deepStrictEqual(output, {
                before: '',
                spanText: 'line1\n',
                after: 'line2\nline3\n',
                hookResult: '...\n'
            });
        });

        it('should replace span at document end', () => {
            const document = 'line1\nline2\nline3';
            const hooks = spanHooksHide();

            const output = testHook(hooks.replace, document, 12, 17);

            deepStrictEqual(output, {
                before: 'line1\nline2\n',
                spanText: 'line3',
                after: '',
                hookResult: '...\n'
            });
        });

        it('should replace entire line at document end', () => {
            const document = 'line1\nHIDDEN';
            const hooks = spanHooksHide();

            const output = testHook(hooks.replace, document, 6, 12);

            deepStrictEqual(output, {
                before: 'line1\n',
                spanText: 'HIDDEN',
                after: '',
                hookResult: '...\n'
            });
        });

        it('should return marker for partial line (single-line partial span)', () => {
            const document = 'prefix hidden suffix';
            const hooks = spanHooksHide();

            const output = testHook(hooks.replace, document, 7, 13);

            deepStrictEqual(output, {
                before: 'prefix ',
                spanText: 'hidden',
                after: ' suffix',
                hookResult: '…'
            });
        });

        it('should use custom skippedLines marker', () => {
            const document = 'line1\nline2\nline3\n';
            const hooks = spanHooksHide({ skippedLines: '-- snip --' });

            const output = testHook(hooks.replace, document, 0, 6);

            deepStrictEqual(output, {
                before: '',
                spanText: 'line1\n',
                after: 'line2\nline3\n',
                hookResult: '-- snip --\n'
            });
        });
    });

    describe('open hook', () => {
        it('should return null for single-line partial span (handled by replace hook)', () => {
            const document = 'prefix hidden suffix';
            const hooks = spanHooksHide({ ellipsis: '<<' });

            const output = testHook(hooks.open, document, 7, 13);

            deepStrictEqual(output, {
                before: 'prefix ',
                spanText: 'hidden',
                after: ' suffix',
                hookResult: null  // Single-line partial spans handled by replace hook
            });
        });

        it('should return null at document end', () => {
            const document = 'line1\nline2';
            const hooks = spanHooksHide();

            const output = testHook(hooks.open, document, 6, 11);

            deepStrictEqual(output, {
                before: 'line1\n',
                spanText: 'line2',
                after: '',
                hookResult: null
            });
        });

        it('should return null when span ends at line content end', () => {
            const document = 'line1\nHIDDEN\nline3';
            const hooks = spanHooksHide();

            const output = testHook(hooks.open, document, 6, 12);

            deepStrictEqual(output, {
                before: 'line1\n',
                spanText: 'HIDDEN',
                after: '\nline3',
                hookResult: null
            });
        });

        it('should return marker for multi-line partial span', () => {
            const document = 'some multi lines text\ngoes here and there';
            const hooks = spanHooksHide({ ellipsis: '<<' });

            const output = testHook(hooks.open, document, 17, 31);

            deepStrictEqual(output, {
                before: 'some multi lines ',
                spanText: 'text\ngoes here',
                after: ' and there',
                hookResult: '<<'  // Marker for content after span
            });
        });

        it('should handle CRLF line endings correctly (edge case: end within CRLF)', () => {
            const document = 'line1\r\nHIDDEN\r\nline3';
            const hooks = spanHooksHide({ ellipsis: '<<' });

            // Test when span ends in middle of line content (before content end)
            const output1 = testHook(hooks.open, document, 7, 11);
            deepStrictEqual(output1, {
                before: 'line1\r\n',
                spanText: 'HIDD',
                after: 'EN\r\nline3',
                hookResult: null  // Single line span (handled by replace hook)
            });

            // Test when span ends at line content end (at \r)
            const output2 = testHook(hooks.open, document, 7, 13);
            deepStrictEqual(output2, {
                before: 'line1\r\n',
                spanText: 'HIDDEN',
                after: '\r\nline3',
                hookResult: null  // At line content end
            });

            // Test when span ends after \r but before \n (edge case within CRLF)
            const output3 = testHook(hooks.open, document, 7, 14);
            deepStrictEqual(output3, {
                before: 'line1\r\n',
                spanText: 'HIDDEN\r',
                after: '\nline3',
                hookResult: null  // Beyond line content end (in newline territory)
            });

            // Test multi-line span ending in middle of line content
            const output4 = testHook(hooks.open, document, 3, 11);
            deepStrictEqual(output4, {
                before: 'lin',
                spanText: 'e1\r\nHIDD',
                after: 'EN\r\nline3',
                hookResult: '<<'  // Multi-line, not at content end - should show marker
            });

            // Test multi-line span ending at \n in CRLF (THE BUG TEST!)
            // Old logic would incorrectly return '<<' because isLineContentEnd(14) = false
            // New logic correctly returns null because 14 >= lineContentEnd (13)
            const output5 = testHook(hooks.open, document, 3, 14);
            deepStrictEqual(output5, {
                before: 'lin',
                spanText: 'e1\r\nHIDDEN\r',
                after: '\nline3',
                hookResult: null  // No marker: beyond line content end (in newline)
            });
        });
    });

    describe('close hook', () => {
        it('should return null for single-line partial span (handled by replace hook)', () => {
            const document = 'prefix hidden suffix';
            const hooks = spanHooksHide({ ellipsis: '>>' });

            const output = testHook(hooks.close, document, 7, 13, true);

            deepStrictEqual(output, {
                before: 'prefix ',
                spanText: 'hidden',
                after: ' suffix',
                hookResult: null  // Single-line partial spans handled by replace hook
            });
        });

        it('should return null at document start', () => {
            const document = 'hidden rest';
            const hooks = spanHooksHide();

            const output = testHook(hooks.close, document, 0, 6, true);

            deepStrictEqual(output, {
                before: '',
                spanText: 'hidden',
                after: ' rest',
                hookResult: null
            });
        });

        it('should return null when span starts at line start', () => {
            const document = 'line1\nHIDDEN\nline3\n';
            const hooks = spanHooksHide();

            const output = testHook(hooks.close, document, 6, 12, true);

            deepStrictEqual(output, {
                before: 'line1\n',
                spanText: 'HIDDEN',
                after: '\nline3\n',
                hookResult: null
            });
        });

        it('should return marker for multi-line partial span', () => {
            const document = 'some multi lines text\ngoes here and there';
            const hooks = spanHooksHide({ ellipsis: '>>' });

            const output = testHook(hooks.close, document, 17, 31, true);

            deepStrictEqual(output, {
                before: 'some multi lines ',
                spanText: 'text\ngoes here',
                after: ' and there',
                hookResult: '>>'  // Marker for content before span
            });
        });
    });

    describe('combined scenarios', () => {
        it('should handle single line partial span (both open and close)', () => {
            // Case 1: some [text] goes here -> some ... goes here
            const document = 'some text goes here';
            const hooks = spanHooksHide<string>();

            const output = applyReplacement(hooks, document, 5, 9);

            deepStrictEqual(output, {
                close: null,
                replace: '…',
                open: null,
                spanText: 'text',
                result: 'some … goes here'
            });
        });

        it('should handle multi-line partial span at both ends', () => {
            // Case 2: some multi lines [text\ngoes here] and there
            const document = 'some multi lines text\ngoes here and there';
            const hooks = spanHooksHide<string>();

            const output = applyReplacement(hooks, document, 17, 31);

            deepStrictEqual(output, {
                close: '…',
                replace: '\n',
                open: '…',
                spanText: 'text\ngoes here',
                result: 'some multi lines …\n… and there'
            });
        });

        it('should handle multi-line span with full lines in middle', () => {
            // Case 3: some multi lines [text\nmiddle line\ngoes here] and there
            const document = 'some multi lines text\nmiddle line\ngoes here and there';
            const hooks = spanHooksHide<string>();

            const output = applyReplacement(hooks, document, 17, 43);

            deepStrictEqual(output, {
                close: '…',
                replace: '\n...\n',
                open: '…',
                spanText: 'text\nmiddle line\ngoes here',
                result: 'some multi lines …\n...\n… and there'
            });
        });

        it('should handle multi-line span with full lines in middle', () => {
            // Case 3: some multi lines [text\nmiddle line\ngoes here] and there
            const document = 'some multi lines text\nmiddle line1\r\nmiddle line2\nmiddle line3\ngoes here and there';
            const hooks = spanHooksHide<string>();

            const output = applyReplacement(hooks, document, 17, 71);

            deepStrictEqual(output, {
                close: '…',
                replace: '\n...\n',
                open: '…',
                spanText: 'text\nmiddle line1\r\nmiddle line2\nmiddle line3\ngoes here',
                result: 'some multi lines …\n...\n… and there'
            });
        });

        it('should handle entire line replacement with no trimming', () => {
            const document = 'line1\nHIDDEN\nline3';
            const hooks = spanHooksHide<string>();

            const output = applyReplacement(hooks, document, 6, 12);

            deepStrictEqual(output, {
                close: null,
                replace: '...',
                open: null,
                spanText: 'HIDDEN',
                result: 'line1\n...\nline3'
            });
        });
    });

    describe('break flag', () => {
        it('should set break flag to true', () => {
            const hooks = spanHooksHide();

            strictEqual(hooks.break, true);
        });
    });
});

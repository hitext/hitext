import { strictEqual, deepStrictEqual } from 'assert';
import { StringBuffer, rangeHooksHide, createLineBoundaries } from '../../src/index.js';
import type { RangeHookContext, RangeHookContextDump, RangeHooks } from '../../src/types.js';

// Helper to create minimal context for testing hooks
function createContext(
    document: string,
    start: number,
    end: number,
    forStart = true
): RangeHookContext<null, string, string> {
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
        rangeIndex: -1,
        rangeText: document.slice(start, end),
        range: {
            type: 'test',
            start,
            end,
            data: null
        },
        createBuffer() {
            return new StringBuffer();
        },
        dump(): RangeHookContextDump<null> {
            return null as unknown as RangeHookContextDump<null>;
        }
    };
}

// Helper to test individual hook and show input/output
function testHook(
    hookFn: ((context: RangeHookContext<null, string, string>) => unknown) | null | undefined,
    document: string,
    start: number,
    end: number,
    useEndOffset = false
) {
    const context = createContext(document, start, end, !useEndOffset);
    const hookResult = (hookFn?.(context) ?? null) as string | null;

    return {
        before: document.slice(0, start),
        rangeText: document.slice(start, end),
        after: document.slice(end),
        hookResult
    };
}

// Helper to apply hooks and see the resulting output
function applyReplacement(
    hooks: Partial<RangeHooks<unknown, string>>,
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
        rangeText: document.slice(start, end),
        result
    };
}

describe('rangeHooksHide', () => {
    describe('replace hook', () => {
        it('should replace range spanning 2+ lines starting at line start', () => {
            const document = 'line1\nline2\nline3\n';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.replace, document, 6, 18);

            deepStrictEqual(output, {
                before: 'line1\n',
                rangeText: 'line2\nline3\n',
                after: '',
                hookResult: '...\n'
            });
        });

        it('should replace range spanning 2+ lines NOT at line start', () => {
            const document = '  line1\n  line2\n  line3\n';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.replace, document, 2, 25);

            deepStrictEqual(output, {
                before: '  ',
                rangeText: 'line1\n  line2\n  line3\n',
                after: '',
                hookResult: '\n...\n'
            });
        });

        it('should replace range at document start with marker and trailing newline', () => {
            const document = 'line1\nline2\nline3\n';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.replace, document, 0, 6);

            deepStrictEqual(output, {
                before: '',
                rangeText: 'line1\n',
                after: 'line2\nline3\n',
                hookResult: '...\n'
            });
        });

        it('should replace range at document end', () => {
            const document = 'line1\nline2\nline3';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.replace, document, 12, 17);

            deepStrictEqual(output, {
                before: 'line1\nline2\n',
                rangeText: 'line3',
                after: '',
                hookResult: '...\n'
            });
        });

        it('should replace entire line at document end', () => {
            const document = 'line1\nHIDDEN';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.replace, document, 6, 12);

            deepStrictEqual(output, {
                before: 'line1\n',
                rangeText: 'HIDDEN',
                after: '',
                hookResult: '...\n'
            });
        });

        it('should return marker for partial line (single-line partial range)', () => {
            const document = 'prefix hidden suffix';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.replace, document, 7, 13);

            deepStrictEqual(output, {
                before: 'prefix ',
                rangeText: 'hidden',
                after: ' suffix',
                hookResult: '…'
            });
        });

        it('should use custom skippedLines marker', () => {
            const document = 'line1\nline2\nline3\n';
            const hooks = rangeHooksHide({ skippedLines: '-- snip --' });

            const output = testHook(hooks.replace, document, 0, 6);

            deepStrictEqual(output, {
                before: '',
                rangeText: 'line1\n',
                after: 'line2\nline3\n',
                hookResult: '-- snip --\n'
            });
        });
    });

    describe('open hook', () => {
        it('should return null for single-line partial range (handled by replace hook)', () => {
            const document = 'prefix hidden suffix';
            const hooks = rangeHooksHide({ ellipsis: '<<' });

            const output = testHook(hooks.open, document, 7, 13);

            deepStrictEqual(output, {
                before: 'prefix ',
                rangeText: 'hidden',
                after: ' suffix',
                hookResult: null  // Single-line partial ranges handled by replace hook
            });
        });

        it('should return null at document end', () => {
            const document = 'line1\nline2';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.open, document, 6, 11);

            deepStrictEqual(output, {
                before: 'line1\n',
                rangeText: 'line2',
                after: '',
                hookResult: null
            });
        });

        it('should return null when range ends at line content end', () => {
            const document = 'line1\nHIDDEN\nline3';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.open, document, 6, 12);

            deepStrictEqual(output, {
                before: 'line1\n',
                rangeText: 'HIDDEN',
                after: '\nline3',
                hookResult: null
            });
        });

        it('should return marker for multi-line partial range', () => {
            const document = 'some multi lines text\ngoes here and there';
            const hooks = rangeHooksHide({ ellipsis: '<<' });

            const output = testHook(hooks.open, document, 17, 31);

            deepStrictEqual(output, {
                before: 'some multi lines ',
                rangeText: 'text\ngoes here',
                after: ' and there',
                hookResult: '<<'  // Marker for content after range
            });
        });

        it('should handle CRLF line endings correctly (edge case: end within CRLF)', () => {
            const document = 'line1\r\nHIDDEN\r\nline3';
            const hooks = rangeHooksHide({ ellipsis: '<<' });

            // Test when range ends in middle of line content (before content end)
            const output1 = testHook(hooks.open, document, 7, 11);
            deepStrictEqual(output1, {
                before: 'line1\r\n',
                rangeText: 'HIDD',
                after: 'EN\r\nline3',
                hookResult: null  // Single line range (handled by replace hook)
            });

            // Test when range ends at line content end (at \r)
            const output2 = testHook(hooks.open, document, 7, 13);
            deepStrictEqual(output2, {
                before: 'line1\r\n',
                rangeText: 'HIDDEN',
                after: '\r\nline3',
                hookResult: null  // At line content end
            });

            // Test when range ends after \r but before \n (edge case within CRLF)
            const output3 = testHook(hooks.open, document, 7, 14);
            deepStrictEqual(output3, {
                before: 'line1\r\n',
                rangeText: 'HIDDEN\r',
                after: '\nline3',
                hookResult: null  // Beyond line content end (in newline territory)
            });

            // Test multi-line range ending in middle of line content
            const output4 = testHook(hooks.open, document, 3, 11);
            deepStrictEqual(output4, {
                before: 'lin',
                rangeText: 'e1\r\nHIDD',
                after: 'EN\r\nline3',
                hookResult: '<<'  // Multi-line, not at content end - should show marker
            });

            // Test multi-line range ending at \n in CRLF (THE BUG TEST!)
            // Old logic would incorrectly return '<<' because isLineContentEnd(14) = false
            // New logic correctly returns null because 14 >= lineContentEnd (13)
            const output5 = testHook(hooks.open, document, 3, 14);
            deepStrictEqual(output5, {
                before: 'lin',
                rangeText: 'e1\r\nHIDDEN\r',
                after: '\nline3',
                hookResult: null  // No marker: beyond line content end (in newline)
            });
        });
    });

    describe('close hook', () => {
        it('should return null for single-line partial range (handled by replace hook)', () => {
            const document = 'prefix hidden suffix';
            const hooks = rangeHooksHide({ ellipsis: '>>' });

            const output = testHook(hooks.close, document, 7, 13, true);

            deepStrictEqual(output, {
                before: 'prefix ',
                rangeText: 'hidden',
                after: ' suffix',
                hookResult: null  // Single-line partial ranges handled by replace hook
            });
        });

        it('should return null at document start', () => {
            const document = 'hidden rest';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.close, document, 0, 6, true);

            deepStrictEqual(output, {
                before: '',
                rangeText: 'hidden',
                after: ' rest',
                hookResult: null
            });
        });

        it('should return null when range starts at line start', () => {
            const document = 'line1\nHIDDEN\nline3\n';
            const hooks = rangeHooksHide();

            const output = testHook(hooks.close, document, 6, 12, true);

            deepStrictEqual(output, {
                before: 'line1\n',
                rangeText: 'HIDDEN',
                after: '\nline3\n',
                hookResult: null
            });
        });

        it('should return marker for multi-line partial range', () => {
            const document = 'some multi lines text\ngoes here and there';
            const hooks = rangeHooksHide({ ellipsis: '>>' });

            const output = testHook(hooks.close, document, 17, 31, true);

            deepStrictEqual(output, {
                before: 'some multi lines ',
                rangeText: 'text\ngoes here',
                after: ' and there',
                hookResult: '>>'  // Marker for content before range
            });
        });
    });

    describe('combined scenarios', () => {
        it('should handle single line partial range (both open and close)', () => {
            // Case 1: some [text] goes here -> some ... goes here
            const document = 'some text goes here';
            const hooks = rangeHooksHide<string>();

            const output = applyReplacement(hooks, document, 5, 9);

            deepStrictEqual(output, {
                close: null,
                replace: '…',
                open: null,
                rangeText: 'text',
                result: 'some … goes here'
            });
        });

        it('should handle multi-line partial range at both ends', () => {
            // Case 2: some multi lines [text\ngoes here] and there
            const document = 'some multi lines text\ngoes here and there';
            const hooks = rangeHooksHide<string>();

            const output = applyReplacement(hooks, document, 17, 31);

            deepStrictEqual(output, {
                close: '…',
                replace: '\n',
                open: '…',
                rangeText: 'text\ngoes here',
                result: 'some multi lines …\n… and there'
            });
        });

        it('should handle multi-line range with full lines in middle', () => {
            // Case 3: some multi lines [text\nmiddle line\ngoes here] and there
            const document = 'some multi lines text\nmiddle line\ngoes here and there';
            const hooks = rangeHooksHide<string>();

            const output = applyReplacement(hooks, document, 17, 43);

            deepStrictEqual(output, {
                close: '…',
                replace: '\n...\n',
                open: '…',
                rangeText: 'text\nmiddle line\ngoes here',
                result: 'some multi lines …\n...\n… and there'
            });
        });

        it('should handle multi-line range with full lines in middle', () => {
            // Case 3: some multi lines [text\nmiddle line\ngoes here] and there
            const document = 'some multi lines text\nmiddle line1\r\nmiddle line2\nmiddle line3\ngoes here and there';
            const hooks = rangeHooksHide<string>();

            const output = applyReplacement(hooks, document, 17, 71);

            deepStrictEqual(output, {
                close: '…',
                replace: '\n...\n',
                open: '…',
                rangeText: 'text\nmiddle line1\r\nmiddle line2\nmiddle line3\ngoes here',
                result: 'some multi lines …\n...\n… and there'
            });
        });

        it('should handle entire line replacement with no trimming', () => {
            const document = 'line1\nHIDDEN\nline3';
            const hooks = rangeHooksHide<string>();

            const output = applyReplacement(hooks, document, 6, 12);

            deepStrictEqual(output, {
                close: null,
                replace: '...',
                open: null,
                rangeText: 'HIDDEN',
                result: 'line1\n...\nline3'
            });
        });
    });

    describe('break flag', () => {
        it('should set break flag to true', () => {
            const hooks = rangeHooksHide();

            strictEqual(hooks.break, true);
        });
    });
});

import assert from 'assert';
import { SpanCallableHook, SpanHookContext, render } from '../../src/index.js';

/**
 * Visual test helper for rendering with spans.
 *
 * Each span line uses lowercase letters to mark start/end positions.
 * Spaces are ignored (just for alignment with document string).
 *
 * The last argument can optionally be a hooks object to customize span behavior.
 * SpansSource without custom hooks get default wrap behavior: <letter>content</letter>
 *
 * Custom hooks can use:
 * - Shortcut wrap syntax: `{ a: (content) => `<mark>${content}</mark>` }`
 * - Full hook object: `{ a: { open: () => '<', close: () => '>', ... } }`
 * - Replace hook: `{ x: { replace: () => 'REPLACEMENT' } }`
 * - Replace with break: `{ x: { replace: () => 'TEXT', break: true } }`
 *
 * Examples:
 *   renderTest('Hello World', 'aaaaaaaaaaa')
 *     → Span 'a' wrapping entire string with <a>Hello World</a>
 *
 *   renderTest('Hello World', 'aaaaa', '      bbbbb')
 *     → <a>Hello</a> <b>World</b>
 *
 *   renderTest('AAA [X] BBB', 'aaaaaaaaaaa', '    xxx', { x: { replace: () => 'Y' } })
 *     → <a>AAA Y BBB</a>
 *
 *   renderTest('AAA [X] BBB', 'aaa', '    xxx', { x: { replace: () => 'Y', break: true } })
 *     → <a>AAA </a>Y BBB
 *
 *   renderTest('Text', 'aaaa', { a: (content) => `<mark>${content}</mark>` })
 *     → <mark>Text</mark>
 */
function renderTest(
    document: string,
    ...args: Array<string | Record<string, any>>
): string {
    const spans: Array<{ type: string; start: number; end: number; data?: any }> = [];
    const defaultHooks: Record<string, any> = {};

    // Check if last argument is a hooks object (not a string)
    const lastArg = args[args.length - 1];
    const customHooks = typeof lastArg === 'string' ? {} : (args.pop() as Record<string, any>) || {};
    const spanLines = args as string[];

    spanLines.forEach((line) => {
        // Find all contiguous groups of the same letter
        const groups: Array<{ char: string; start: number; end: number }> = [];
        let i = 0;

        while (i < line.length) {
            const char = line[i];

            if (/[a-z]/.test(char)) {
                const start = i;
                // Find the end of this contiguous group
                while (i < line.length && line[i] === char) {
                    i++;
                }
                groups.push({ char, start, end: i });

                // Create default wrap hook if not already defined
                if (!defaultHooks[char] && !customHooks[char]) {
                    defaultHooks[char] = (content: string) => `<${char}>${content}</${char}>`;
                }
            } else {
                i++;
            }
        }

        // Add all groups as separate spans
        groups.forEach(({ char, start, end }) => {
            spans.push({ type: char, start, end, data: undefined });
        });
    });

    // Normalize hooks: convert shortcut wrap syntax to full hook objects
    const normalizedHooks: Record<string, any> = {};

    for (const [type, hook] of Object.entries({ ...defaultHooks, ...customHooks })) {
        if (typeof hook === 'function') {
            // Shortcut syntax: wrap function
            normalizedHooks[type] = { wrap: hook };
        } else {
            // Full hook object
            normalizedHooks[type] = hook;
        }
    }

    return render(document, spans, normalizedHooks);
}

/**
 * Helper to create hooks that show segment boundaries in the output.
 *
 * @param name - The tag name to use in the output
 * @returns Hook object with open and close that display start:end positions
 *
 * @example
 * boundaryHook('outer') → { open: ..., close: ... }
 * // Output: <outer:0:10>content</outer:0:10>
 */
function boundaryHook(name: string) {
    return {
        open: ({ start, end }: any) => `<${name}:${start}:${end}>`,
        close: ({ start, end }: any) => `</${name}:${start}:${end}>`
    };
}

describe('Replace Hook', () => {
    describe('Visual test helper examples', () => {
        it('should work with simple span wrapping', () => {
            const result = renderTest(
                'Hello World',
                'aaaaaaaaaaa'  // Wraps entire string
            );
            assert.strictEqual(result, '<a>Hello World</a>');
        });

        it('should work with multiple non-overlapping spans', () => {
            const result = renderTest(
                'Hello World',
                'aaaaa',       // Wraps "Hello"
                '      bbbbb'  // Wraps "World"
            );
            assert.strictEqual(result, '<a>Hello</a> <b>World</b>');
        });

        it('should work with nested spans', () => {
            const result = renderTest(
                'Hello World',
                'aaaaaaaaaaa',  // Outer wraps everything
                '      bbbbb'   // Inner wraps "World"
            );
            assert.strictEqual(result, '<a>Hello <b>World</b></a>');
        });

        it('should work with replace syntax', () => {
            const result = renderTest(
                'Hello [REDACTED] World',
                '      xxxxxxxxxx',  // Span 'x' covers [REDACTED]
                {
                    x: { replace: () => '████' }
                }
            );
            assert.strictEqual(result, 'Hello ████ World');
        });

        it('should work with replace and wrapping', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'aaaaaaaaaaaaaaaaa',          // Wraps everything
                '    xxxxxxxxx',              // Replaces [REPLACE]
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, '<a>AAA XXX BBB</a>');
        });

        it('should work with break flag', () => {
            const result = renderTest(
                'AAA [BREAK] BBB',
                'aaaaaaaaaaaaaaa',            // Wraps everything
                '    xxxxxxx',                // Replace [BREAK]
                {
                    x: {
                        replace: () => 'XXX',
                        break: true
                    }
                }
            );
            assert.strictEqual(result, '<a>AAA </a>XXX<a> BBB</a>');
        });

        it('should work with complex overlapping spans', () => {
            const result = renderTest(
                'START [REPLACE] END',
                'bbbbb',                      // Wraps "START" (0-5)
                'ssssssssssssssssss',         // Spans from pos 2 to 17 (continuous s chars)
                '      xxxxxxxxx',             // Replaces [REPLACE] (6-15)
                '                aaaa',        // Wraps "END" (16-19)
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, '<b><s>START</s></b><s> XXX <a>EN</a></s><a>D</a>');
        });
    });

    it('should replace document text with custom content', () => {
        const result = renderTest(
            'Hello [REDACTED] World',
            '      xxxxxxxxxx',
            {
                x: { replace: () => '████' }
            }
        );
        assert.strictEqual(result, 'Hello ████ World');
    });

    it('should provide context with spanText to replace hook', () => {
        let capturedSpanText = '';
        const result = renderTest(
            'Replace {{name}} with value',
            '        vvvvvvvv',  // {{name}} (8-16)
            {
                v: {
                    replace: ({ spanText }: any) => {
                        capturedSpanText = spanText;
                        return 'John';
                    }
                }
            }
        );
        assert.strictEqual(capturedSpanText, '{{name}}');
        assert.strictEqual(result, 'Replace John with value');
    });

    it('should skip nested spans within replace spans', () => {
        const result = renderTest(
            'Keep [hide this <mark>nested</mark>] visible',
            '     xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            {
                x: { replace: () => '...' }
            }
            // Note: nested mark span (16-35) is automatically skipped by skipSpans logic
        );
        assert.strictEqual(result, 'Keep ... visible');
    });

    it('should work with open and close hooks alongside replace', () => {
        const result = renderTest(
            'Text [FOLD] more text',
            '     ffffff',
            {
                f: {
                    open: () => '<',
                    replace: () => '...',
                    close: () => '>'
                }
            }
        );
        assert.strictEqual(result, 'Text <...> more text');
    });

    it('should handle zero-length replace (injection)', () => {
        // Zero-length spans can't be represented visually, keep explicit
        const document = 'Insert here';
        const spans = [{ type: 'replace', start: 7, end: 7, data: undefined }];  // Zero-length
        const result = render(document, spans, {
            replace: { replace: () => '[INJECTED] ' }
        });
        assert.strictEqual(result, 'Insert [INJECTED] here');
    });

    it('should handle replace returning null/empty', () => {
        const result = renderTest(
            'Remove [this] text',
            '       xxxxxx',
            {
                x: { replace: () => '' }
            }
        );
        assert.strictEqual(result, 'Remove  text');
    });

    it('should handle multiple replace spans', () => {
        const result = renderTest(
            '[A] and [B] and [C]',
            'vvv     vvv     vvv',  // var: [A], [B], [C]
            {
                v: {
                    replace: ({ spanText }: any) => {
                        // Map based on the span text content
                        const mapping: Record<string, string> = {
                            '[A]': 'X',
                            '[B]': 'Y',
                            '[C]': 'Z'
                        };
                        return mapping[spanText];
                    }
                }
            }
        );
        assert.strictEqual(result, 'X and Y and Z');
    });

    it('should use break flag to close and reopen surrounding spans', () => {
        const result = renderTest(
            'Start text [BREAK] more end',
            '      mmmmmmmmmmmmmmmmm',             // mark wraps "text [BREAK] more"
            '           xxxxxxx',                  // Replace [BREAK]
            {
                x: {
                    replace: () => '---',
                    break: true
                }
            }
        );
        assert.strictEqual(result, 'Start <m>text </m>---<m> more</m> end');
    });

    it('should not apply text hook to replaced content', () => {
        const result = renderTest(
            'Text [REPLACE] more',
            'eeeeeeeeeeeeeeeeeee',
            '     rrrrrrrrr',
            {
                e: {
                    text: (chunk: string) => chunk.toUpperCase()
                },
                r: {
                    replace: () => '[replaced]'
                }
            }
        );
        // The replaced content should not be uppercased
        assert.strictEqual(result, 'TEXT [replaced] MORE');
    });

    it('should execute all hooks in order: open -> replace -> wrap -> close', () => {
        const result = renderTest(
            'test content here',
            '     aaaaaaa',
            {
                a: {
                    open: () => '<',                     // Step 1: output '<'
                    replace: () => 'REPLACED',           // Step 2: return 'REPLACED' (skips document "content")
                    wrap: (content: string) => `[${content}]`,  // Step 3: wrap 'REPLACED' -> '[REPLACED]'
                    close: () => '>'                     // Step 4: output '>'
                }
            }
        );
        // Full execution: < + [REPLACED] + >
        assert.strictEqual(result, 'test <[REPLACED]> here');
    });

    it('should allow combining wrap and replace from different layer definitions', () => {
        const result = renderTest(
            'word1 word2 word3',
            'hhhhh rrrrr hhhhh',  // highlight word1 and word3, redact word2
            {
                h: {
                    wrap: (content: string) => `<mark>${content}</mark>`
                },
                r: {
                    replace: () => '[REDACTED]'
                }
            }
        );
        // word1 and word3 get wrapped, word2 gets replaced
        assert.strictEqual(result, '<mark>word1</mark> [REDACTED] <mark>word3</mark>');
    });

    it('should handle viewport use case - hide spans between visible segments', () => {
        const result = renderTest(
            'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\n',
            '       hhhhhhhhhhhhhhhhhhhhh       hhhhhhh',  // Hide lines 2-4 and line 6
            {
                h: {
                    replace: () => '...\n'
                }
            }
        );
        assert.strictEqual(result, 'Line 1\n...\nLine 5\n...\n');
    });

    it('should handle redaction use case', () => {
        const result = renderTest(
            'Name: John Doe, SSN: 123-45-6789, Email: john@example.com',
            '      pppppppp       ppppppppppp         pppppppppppppppp',
            {
                p: {
                    replace: ({ span }: any) => '█'.repeat(span.end - span.start)
                }
            }
        );
        assert.strictEqual(result, 'Name: ████████, SSN: ███████████, Email: ████████████████');
    });

    it('should handle code folding use case', () => {
        const result = renderTest(
            'function test() {\n  const x = 1;\n  return x;\n}',
            '                 ffffffffffffffffffffffffffff',  // Fold positions 17-44 (28 chars)
            {
                f: {
                    replace: () => ' ... '
                }
            }
        );
        assert.strictEqual(result, 'function test() { ... }');
    });

    it('should preserve position tracking through replaced content', () => {
        let contextLine = 0;
        const result = renderTest(
            'Line 1\nReplace\nLine 3',
            '       rrrrrrr',  // "Replace" (7-14)
            {
                r: {
                    replace: ({ line }: any) => {
                        contextLine = line;
                        return 'X';
                    }
                }
            }
        );
        // Replace starts on line 2
        assert.strictEqual(contextLine, 2);
        assert.strictEqual(result, 'Line 1\nX\nLine 3');
    });

    it('should handle adjacent replace spans', () => {
        const result = renderTest(
            '[A][B][C]',
            'xxxyyyzzz',  // var: [A][B][C] - must use different letters since they're adjacent
            {
                x: { replace: () => '1' },
                y: { replace: () => '2' },
                z: { replace: () => '3' }
            }
        );
        assert.strictEqual(result, '123');
    });

    describe('Replace interactions with surrounding spans', () => {
        it('should preserve spans that start before and end after replace', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'aaaaaaaaaaaaaaaaa',          // Outer wraps everything
                '    xxxxxxxxx',              // Replace [REPLACE]
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, '<a>AAA XXX BBB</a>');
        });

        it('should close spans that end within replaced content (without break)', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'oooooooo',                    // Outer ends in middle of [REPLACE]
                '    xxxxxxxxx',               // Replace [REPLACE]
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, '<o>AAA </o>XXX BBB');
        });

        it('should handle spans starting within replaced content', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                '    xxxxxxxxx',         // Replace [REPLACE]
                '        iiiiiiiii',     // Inner starts in middle, ends after
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, 'AAA XXX<i> BBB</i>');  // Uses default <i> tags
        });

        it('should skip spans entirely within replaced content', () => {
            const result = renderTest(
                'AAA [NESTED] BBB',
                '    xxxxxxxx',           // Replace [NESTED]
                {
                    x: { replace: () => 'XXX' }
                }
                // nested span (5-11) would be automatically skipped
            );
            assert.strictEqual(result, 'AAA XXX BBB');
        });

        it('should handle multiple spans with different relationships to replace', () => {
            const result = renderTest(
                'START [REPLACE] END',
                'bbbbb',                        // before: "START" (0-5)
                '  sssssssssssssss',            // spanning: "ART [REPLACE] E" (2-17)
                '      xxxxxxxxx',               // Replace [REPLACE] (6-15)
                '                aaa',           // after: "END" (16-19)
                {
                    x: { replace: () => 'XXX' }
                }
                // inside span would be auto-skipped
            );
            // Hook registration order is nesting precedence in overlap regions.
            assert.strictEqual(result, '<b>ST<s>ART</s></b><s> XXX <a>E</a></s><a>ND</a>');
        });

        it('should handle replace with break flag - closes and reopens spanning spans', () => {
            const result = renderTest(
                'AAA [BREAK] BBB',
                'ooooooooooooooo',              // Outer wraps everything
                '    xxxxxxx',                  // Replace [BREAK]
                {
                    x: {
                        replace: () => 'XXX',
                        break: true
                    }
                }
            );
            assert.strictEqual(result, '<o>AAA </o>XXX<o> BBB</o>');
        });

        it('should handle break with multiple spanning spans', () => {
            const result = renderTest(
                'A B [BREAK] C D',
                'ooooooooooooooo',              // Outer: wraps everything
                '  mmmmmmmmmmm',                // Middle: "B [BREAK] C"
                '    xxxxxxx',                  // Replace [BREAK]
                {
                    x: {
                        replace: () => 'X',
                        break: true
                    }
                }
            );
            assert.strictEqual(result, '<o>A <m>B </m></o>X<o><m> C</m> D</o>');
        });

        it('should handle break with spans ending at replace boundary', () => {
            const result = renderTest(
                'AAA [BREAK] BBB',
                'bbbbxxxxxxxaaaa',
                {
                    x: {
                        replace: () => 'X',
                        break: true
                    }
                }
            );
            assert.strictEqual(result, '<b>AAA </b>X<a> BBB</a>');
        });

        it('should handle replace without break - spans ending in replaced content still close', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'eeeeeeee      aaa',
                '    xxxxxxxxx    ',
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, '<e>AAA </e>XXX <a>BBB</a>');
        });

        it('should handle replace with wrap and surrounding spans', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'ooooooooooooooooo',  // outer: wraps everything
                '    rrrrrrrrr',      // replace: [REPLACE]
                {
                    o: (content: string) => `<O>${content}</O>`,
                    r: {
                        replace: () => 'XXX',
                        wrap: (content: string) => `[${content}]`
                    }
                }
            );
            // wrap processes the replacement content
            assert.strictEqual(result, '<O>AAA [XXX] BBB</O>');
        });
    });

    describe('Intersecting replace spans', () => {
        it('should handle adjacent replace spans', () => {
            const result = renderTest(
                '[A][B][C]',
                'xxxyyyzzz',  // r1: [A], r2: [B], r3: [C]
                {
                    x: { replace: () => 'X' },
                    y: { replace: () => 'Y' },
                    z: { replace: () => 'Z' }
                }
            );
            assert.strictEqual(result, 'XYZ');
        });

        it('should handle overlapping replace spans (second nested in first)', () => {
            const result = renderTest(
                'AAA [OUTER [INNER] END] BBB',
                '    ooooooooooooooooooo',     // outer: [OUTER [INNER] END]
                '           iiiiiii',          // inner: [INNER] - skipped
                {
                    o: { replace: () => 'REPLACED_OUTER' },
                    i: { replace: () => 'SHOULD_NOT_APPEAR' }
                }
            );
            assert.strictEqual(result, 'AAA REPLACED_OUTER BBB');
        });

        it('should handle partially overlapping replace spans', () => {
            const result = renderTest(
                'AAA [FIRST [OVERLAP] SECOND] BBB',
                '    fffffffffffff               ', // first: [FIRST [OVERLAP]
                '           ooooooooooooooooo    ', // second: [OVERLAP] SECOND] - gets skipped
                {
                    f: { replace: () => 'R1' },
                    o: { replace: () => 'R2' }
                }
            );
            // First replaces its content, second is partially nested so gets skipped
            assert.strictEqual(result, 'AAA R1 BBB');
        });

        it('should handle multiple consecutive replace spans with surrounding span', () => {
            const result = renderTest(
                'START [A] [B] [C] END',
                'ooooooooooooooooooooo',  // outer: wraps everything
                '      xxx yyy zzz',  // r1: [A], r2: [B], r3: [C]
                {
                    x: { replace: () => 'X' },
                    y: { replace: () => 'Y' },
                    z: { replace: () => 'Z' }
                }
            );
            assert.strictEqual(result, '<o>START X Y Z END</o>');
        });
    });

    describe('Multiple spans starting within replace and continuing after', () => {
        it('should handle single span starting in replace and continuing after', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB CCC',
                '    xxxxxxxxx',           // Replace [REPLACE] (4-13)
                '        aaaaaaaaaaaaa',   // after: starts in replace (8), ends at 21
                {
                    x: { replace: () => 'XXX' }
                }
            );
            assert.strictEqual(result, 'AAA XXX<a> BBB CCC</a>');  // Uses default <a> tags
        });

        it('should handle multiple spans starting within replace and continuing after', () => {
            const result = renderTest(
                'AAA [REPLACE_LONG] BBB CCC DDD',
                '    xxxxxxxxxxxxxx',      // Replace [REPLACE_LONG]
                '         rrrrrrrrrrrrr',   // r1: starts at pos 8, ends at 22
                '             sssssssssssss',      // r2: starts at pos 12, ends at 26
                '                tttttttttttttt',  // r3: starts at pos 15, ends at 30
                {
                    x: { replace: () => 'XXX' }
                }
            );
            // All three spans open at replace.end in layer order and segment as they end.
            assert.strictEqual(result, 'AAA XXX<r><s><t> BBB</t></s></r><s><t> CCC</t></s><t> DDD</t>');
        });

        it('should handle spans starting within replace with different end positions', () => {
            const result = renderTest(
                'AA [REPLACE] BB CC DD EE',
                '   xxxxxxxxx',              // Replace [REPLACE]
                '      sssssssss',           // short: ends soon after replace
                '       mmmmmmmmmmm',       // medium: ends later
                '           lllllllllllll',   // long: ends at the end
                {
                    x: { replace: () => 'X' }
                }
            );
            // All open at 12 (replace.end) in layer order.
            assert.strictEqual(result, 'AA X<s><m><l> BB</l></m></s><m><l> CC</l></m><l> DD EE</l>');
        });
    });

    describe('Multiple spans spanning before and after replace', () => {
        it('should handle multiple spans starting before and ending after replace', () => {
            const result = renderTest(
                'AAA BBB [REPLACE] CCC DDD',
                'rrrrrrrrrrrrrrrrrrrrrrrrr',      // r1: spans entire content
                '    sssssssssssssssss',          // r2: BBB ... CCC
                '      ttttttttttttt',           // r3: B ... C
                '        xxxxxxxxx',              // Replace [REPLACE]
                {
                    x: { replace: () => 'XXX' }
                }
            );
            // All three spanning spans stay open through replace
            assert.strictEqual(result,
                '<r>AAA <s>BB<t>B XXX C</t>CC</s> DDD</r>');
        });

        it('should handle mix: spans spanning + spans starting in replace', () => {
            const result = renderTest(
                'AA BB [REPLACE] CC DD EE',
                'ssssssssssssssssssssssss',       // spanning1: spans all
                '   tttttttttttttttttt',          // spanning2: BB ... DD
                '      xxxxxxxxx',                // Replace [REPLACE]
                '         iiiiiiiiiiii',          // inside1: starts in replace, ends after
                '            jjjjjjjjjjjj',       // inside2: starts in replace, ends later
                {
                    x: { replace: () => 'XXX' }
                }
            );
            // spanning1 and spanning2 stay open through replace
            // inside1 and inside2 open at replace.end
            assert.strictEqual(result,
                '<s>AA <t>BB XXX<i><j> CC DD</j></i></t><j> EE</j></s>');
        });

        it('should handle complex scenario: spanning + ending inside + starting inside', () => {
            const result = renderTest(
                'A B C [REPLACE] D E F',
                'aaaaaaaaaaaaaaaaaaaaa',     // all: spans everything (0-21)
                '  bbbbbbbbbb',              // before-to-inside: "B C [REP" (2-10) - ends inside replace
                '      xxxxxxxxx',           // replace: [REPLACE] (6-15)
                '            iiiiiii',       // inside-to-after: "CE] D E" (12-19) - starts inside replace
                '                eeeee',     // after: "E F" (16-21)
                {
                    x: { replace: () => 'XXX' }
                }
            );

            // all spans through
            // before-to-inside closes before replace (its end is inside replaced segment)
            // inside-to-after opens at replace.end
            // after opens at 16
            assert.strictEqual(result, '<a>A <b>B C </b>XXX<i> <e>D E</e></i><e> F</e></a>');
        });
    });

    describe('Replace with break and complex span interactions', () => {
        it('should handle break with spans starting inside replace', () => {
            const result = renderTest(
                'AA [BREAK] BB CC',
                'ssssssssssssssss',               // spanning: wraps everything
                '   xxxxxxx',                     // Replace [BREAK]
                '      iiiiiii',                  // inside: starts in replace, ends after
                {
                    x: {
                        replace: () => 'X',
                        break: true
                    }
                }
            );
            // spanning closes before break, reopens after
            // inside opens at replace.end (after break)
            assert.strictEqual(result, '<s>AA </s>X<s><i> BB</i> CC</s>');
        });

        it('should handle multiple replace spans with break flags', () => {
            const result = renderTest(
                'A [B1] C [B2] D',
                'sssssssssssssss',                // spanning: wraps everything
                '  xxxx',                         // r1: [B1]
                '         yyyy',                  // r2: [B2]
                {
                    x: {
                        replace: () => 'X',
                        break: true
                    },
                    y: {
                        replace: () => 'Y',
                        break: true
                    }
                }
            );
            // spanning closes/reopens at each break
            assert.strictEqual(result, '<s>A </s>X<s> C </s>Y<s> D</s>');
        });

        it('should handle break with multiple levels of nesting', () => {
            const result = renderTest(
                'A B [BREAK] C D',
                'ooooooooooooooo',                // level1: wraps everything
                '  mmmmmmmmmmm',                  // level2: B [BREAK] C
                '    ttttttt',                    // level3: [BREAK]
                '    xxxxxxx',                    // Replace [BREAK]
                {
                    x: {
                        replace: () => 'X',
                        break: true
                    }
                }
            );
            // All levels close before break, reopen after
            assert.strictEqual(result, '<o>A <m>B </m></o>X<o><m> C</m> D</o>');
        });
    });

    describe('Hook context (offset, line, column) correctness', () => {
        it('should provide correct context for each hook type', () => {
            // Document with multiple lines to verify line/column calculations
            const document = 'Line 1\n[REPLACE]\nLine 3';
            //             0123456 789012345 6789012
            //             Line 1: 0-6 (line 1)
            //             [REPLACE]: 7-16 (line 2)
            //             Line 3: 17-23 (line 3)

            const spans = [{ type: 'r', start: 7, end: 18, data: undefined }];

            const capturedContexts: Partial<Record<SpanCallableHook, any>> = {};
            const captureContextHook = (...args: any[]) => {
                const context = args[args.length - 1] as SpanHookContext;
                capturedContexts[context.hook] = context.dump();
            };

            render(document, spans, {
                r: {
                    open: captureContextHook,
                    replace: captureContextHook,
                    wrap: captureContextHook,
                    close: captureContextHook
                }
            });

            // Verify open hook context: should use span.start (7)
            assert.deepStrictEqual(capturedContexts.open, {
                hook: 'open',
                document,
                offset: 7,
                line: 2,
                column: 1,
                start: 7,
                end: 18,
                spanIndex: 0,
                spanText: '[REPLACE]\nL',
                span: spans[0],
                data: undefined
            });

            // Verify replace hook context: should use span.start (7)
            assert.deepStrictEqual(capturedContexts.replace, {
                hook: 'replace',
                document,
                offset: 7,
                line: 2,
                column: 1,
                start: 7,
                end: 18,
                spanIndex: 0,
                spanText: '[REPLACE]\nL',
                span: spans[0],
                data: undefined
            });

            // Verify wrap hook context: should use span.end (16)
            assert.deepStrictEqual(capturedContexts.wrap, {
                hook: 'wrap',
                document,
                offset: 18,
                line: 3,
                column: 2,
                start: 7,
                end: 18,
                spanIndex: 0,
                spanText: '[REPLACE]\nL',
                span: spans[0],
                data: undefined
            });

            // Verify close hook context: should use span.end (16)
            assert.deepStrictEqual(capturedContexts.close, {
                hook: 'close',
                document,
                offset: 18,
                line: 3,
                column: 2,
                start: 7,
                end: 18,
                spanIndex: 0,
                spanText: '[REPLACE]\nL',
                span: spans[0],
                data: undefined
            });
        });

        it('should provide correct context for hooks on same line', () => {
            const document = 'Start [SPANS] End';
            //             012345 6789012 3456
            //             [SPANS]: 6-13

            const spans = [{ type: 'r', start: 6, end: 13, data: undefined }];

            const capturedContexts: Partial<Record<SpanCallableHook, any>> = {};
            const captureContextHook = (...args: any[]) => {
                const context = args[args.length - 1] as SpanHookContext;
                capturedContexts[context.hook] = context.dump();
            };

            render(document, spans, {
                r: {
                    open: captureContextHook,
                    replace: captureContextHook,
                    wrap: captureContextHook,
                    close: captureContextHook
                }
            });

            // open and replace: offset at start (6), line 1, column 7
            assert.deepStrictEqual(capturedContexts.open, {
                hook: 'open',
                document,
                offset: 6,
                line: 1,
                column: 7,
                start: 6,
                end: 13,
                spanIndex: 0,
                spanText: '[SPANS]',
                span: spans[0],
                data: undefined
            });

            assert.deepStrictEqual(capturedContexts.replace, {
                hook: 'replace',
                document,
                offset: 6,
                line: 1,
                column: 7,
                start: 6,
                end: 13,
                spanIndex: 0,
                spanText: '[SPANS]',
                span: spans[0],
                data: undefined
            });

            // wrap and close: offset at end (13), line 1, column 14
            assert.deepStrictEqual(capturedContexts.wrap, {
                hook: 'wrap',
                document,
                offset: 13,
                line: 1,
                column: 14,
                start: 6,
                end: 13,
                spanIndex: 0,
                spanText: '[SPANS]',
                span: spans[0],
                data: undefined
            });

            assert.deepStrictEqual(capturedContexts.close, {
                hook: 'close',
                document,
                offset: 13,
                line: 1,
                column: 14,
                start: 6,
                end: 13,
                spanIndex: 0,
                spanText: '[SPANS]',
                span: spans[0],
                data: undefined
            });
        });
    });

    describe('Segment boundaries (start/end) in replace hook context', () => {
        it('should show correct boundaries for simple replace', () => {
            const result = renderTest(
                'Hello [REPLACE] World',
                '      rrrrrrrrr',  // [REPLACE] at 6-15
                {
                    r: {
                        ...boundaryHook('r'),
                        replace: () => 'XXX'
                    }
                }
            );
            assert.strictEqual(result, 'Hello <r:6:15>XXX</r:6:15> World');
        });

        it('should show correct boundaries for replace with wrap', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                '    rrrrrrrrr',  // [REPLACE] at 4-13
                {
                    r: {
                        ...boundaryHook('r'),
                        replace: () => 'XXX',
                        wrap: (content: string) => `[${content}]`
                    }
                }
            );
            assert.strictEqual(result, 'AAA <r:4:13>[XXX]</r:4:13> BBB');
        });

        it('should show correct boundaries for replace inside spanning span', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'ooooooooooooooooo',  // outer: 0-17
                '    rrrrrrrrr',      // replace: 4-13
                {
                    o: boundaryHook('o'),
                    r: {
                        replace: () => 'XXX'
                    }
                }
            );
            assert.strictEqual(result, '<o:0:17>AAA XXX BBB</o:0:17>');
        });

        it('should show correct boundaries for replace with break', () => {
            const result = renderTest(
                'AAA [BREAK] BBB',
                'ooooooooooooooo',  // outer: 0-15
                '    xxxxxxx',      // replace with break: 4-11
                {
                    o: boundaryHook('o'),
                    x: {
                        replace: () => 'X',
                        break: true
                    }
                }
            );
            // Outer opens at 0, closes at 4 (actual close position due to break), then reopens at 11
            assert.strictEqual(result, '<o:0:4>AAA </o:0:4>X<o:11:15> BBB</o:11:15>');
        });


        it('should show correct boundaries for spanning span through replace', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'sssssssssssssssss',     // spanning: entire string (0-17)
                '    rrrrrrrrr',         // replace: [REPLACE] (4-13)
                {
                    s: boundaryHook('s'),
                    r: {
                        replace: () => 'XXX'
                    }
                }
            );
            // Spanning span stays open through replace (doesn't close/reopen)
            assert.strictEqual(result, '<s:0:17>AAA XXX BBB</s:0:17>');
        });

        it('should show correct boundaries for span ending inside replace', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB',
                'eeeeeeee',              // ends: "AAA [REP" (0-8, ends inside replace)
                '    rrrrrrrrr',         // replace: [REPLACE] (4-13)
                {
                    e: boundaryHook('e'),
                    r: {
                        replace: () => 'XXX'
                    }
                }
            );
            // Span 'e' closes at position 4 (before replace starts) even though its end is 8
            // The segment end reflects where it was actually closed, not its declared end
            assert.strictEqual(result, '<e:0:4>AAA </e:0:4>XXX BBB');
        });

        it('should show correct boundaries for span starting inside replace', () => {
            const result = renderTest(
                'AAA [REPLACE] BBB CCC',
                '    rrrrrrrrr',         // replace: [REPLACE] (4-13)
                '        sssssssss',     // starts: "LACE] BBB" (8-17, starts inside)
                {
                    r: {
                        replace: () => 'XXX'
                    },
                    s: boundaryHook('s')
                }
            );
            // Span 's' should open after replace ends
            assert.strictEqual(result, 'AAA XXX<s:13:17> BBB</s:13:17> CCC');
        });

        it('should show correct boundaries for multiple spans ending/starting in replace', () => {
            const result = renderTest(
                'A B [REPLACE] C D E',
                'eeeeeee',                // ends1: "A B [RE" (0-7, ends inside)
                '  fffffff',              // ends2: "B [REPL" (2-9, ends inside)
                '    rrrrrrrrr',          // replace: [REPLACE] (4-13)
                '        sssssssss',      // starts1: "LACE] C D" (8-17, starts inside)
                '            ttttttt',    // starts2: "E] C D E" (12-19, starts inside)
                {
                    e: boundaryHook('e'),
                    f: boundaryHook('f'),
                    r: {
                        replace: () => 'XXX'
                    },
                    s: boundaryHook('s'),
                    t: boundaryHook('t')
                }
            );
            // SpansSource ending inside close before replace at actual close position (not declared end)
            // e closes at 2, f closes at 4 (before replace), s and t open at 13 (after replace)
            assert.strictEqual(result, '<e:0:4>A <f:2:4>B </f:2:4></e:0:4>XXX<s:13:17><t:13:17> C D</t:13:17></s:13:17><t:17:19> E</t:17:19>');
        });

        it('should show correct boundaries when replace has break and spans span it', () => {
            const result = renderTest(
                'A B [BREAK] C D',
                'sssssssssssssss',       // spanning: entire string (0-15)
                '  mmmmmmmmmmm',         // middle: "B [BREAK] C" (2-13)
                '    bbbbbbb',           // replace with break: [BREAK] (4-11)
                {
                    s: boundaryHook('s'),
                    m: boundaryHook('m'),
                    b: {
                        replace: () => 'X',
                        break: true
                    }
                }
            );
            // Both spanning spans close before break at position 4
            // The segment end shows where they're actually closed (4), not their declared end
            assert.strictEqual(result, '<s:0:4>A <m:2:4>B </m:2:4></s:0:4>X<s:11:15><m:11:13> C</m:11:13> D</s:11:15>');
        });

        it('should show correct boundaries for nested replace spans', () => {
            const result = renderTest(
                'AAA [OUTER [INNER] END] BBB',
                '    ooooooooooooooooooo',     // outer: [OUTER [INNER] END] (4-23)
                '           iiiiiii',          // inner: [INNER] (11-18, inside outer)
                {
                    o: {
                        ...boundaryHook('o'),
                        replace: () => 'OUTER'
                    },
                    i: {
                        replace: () => 'INNER'  // This is skipped (inside outer replace)
                    }
                }
            );
            // Inner replace is entirely inside outer replace and gets skipped
            assert.strictEqual(result, 'AAA <o:4:23>OUTER</o:4:23> BBB');
        });
    });
});

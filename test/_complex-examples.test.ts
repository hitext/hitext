import { strictEqual } from 'assert';
import {
    html,
    string,
    rangesForMatch,
    rangesCompose,
    applyExpandTo,
    applyInvert,
    rangesForLines,
    applyCollapseTo,
    rangesFromLayer,
    rangesConcat,
    rangesFromOptions
} from '../src/index.js';

describe('Viewport (Windowing/Framing) Use Cases', () => {
    describe('Basic viewport with matched content', () => {
        it('should show only lines containing matches', () => {
            const document = 'line1\nline2 match\nline3\nline4 match\nline5';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            // Should show only line2 and line4 with matches highlighted
            strictEqual(
                output,
                '...\n' +
                'line2 <mark>match</mark>\n' +
                '...\n' +
                'line4 <mark>match</mark>\n' +
                '...\n'
            );
        });

        it('should show matches with 1 line of context', () => {
            const document = 'line1\nline2\nline3 match\nline4\nline5';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 1),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            // Should show line2, line3 (with match), line4
            strictEqual(
                output,
                '...\n' +
                'line2\n' +
                'line3 <mark>match</mark>\n' +
                'line4\n' +
                '...\n'
            );
        });

        it('should merge adjacent context windows', () => {
            const document = 'line1\nline2 A\nline3\nline4 B\nline5';

            const output = html()
                .addLayer(
                    rangesForMatch(/A|B/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 1),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            // line2 ± 1 = [0,1,2,3], line4 ± 1 = [2,3,4,5]
            // They overlap at lines 2-3, so should show lines 0-5 continuously
            strictEqual(
                output,
                'line1\n' +
                'line2 <mark>A</mark>\n' +
                'line3\n' +
                'line4 <mark>B</mark>\n' +
                'line5'
            );
        });
    });

    describe('Multiple match types with viewport', () => {
        it('should highlight different match types within viewport', () => {
            const document = 'line1\nerror: bad\nline3\nwarning: check\nline5';

            const output = html()
                .addLayer(
                    rangesForMatch(/error/gi),
                    (content) => `<span class="error">${content}</span>`,
                    'errors'
                )
                .addLayer(
                    rangesForMatch(/warning/gi),
                    (content) => `<span class="warning">${content}</span>`,
                    'warnings'
                )
                .addLayer(
                    rangesCompose(
                        rangesConcat(rangesFromLayer('errors'), rangesFromLayer('warnings')),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(
                output,
                '...\n' +
                '<span class="error">error</span>: bad\n' +
                '...\n' +
                '<span class="warning">warning</span>: check\n' +
                '...\n'
            );
        });
    });

    describe('Custom separator between viewport windows', () => {
        it('should use custom separator text', () => {
            const document = 'line1\nline2 A\nline3\nline4\nline5 B\nline6';

            const output = html()
                .addLayer(
                    rangesForMatch(/A|B/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '\n--- snip ---\n' }
                )
                .render(document);

            strictEqual(
                output,
                '\n--- snip ---\n' +
                'line2 <mark>A</mark>\n' +
                '\n--- snip ---\n' +
                'line5 <mark>B</mark>\n' +
                '\n--- snip ---\n'
            );
        });

        it('should support dynamic separator based on hidden content', () => {
            const document = 'line1\nline2\nline3 match\nline4\nline5\nline6\nline7 match\nline8';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    {
                        replace: ({ rangeText }) => {
                            const lines = rangeText.split('\n').length;
                            return `\n... ${lines} lines hidden ...\n`;
                        }
                    }
                )
                .render(document);

            strictEqual(
                output,
                '\n... 3 lines hidden ...\n' +
                'line3 <mark>match</mark>\n' +
                '\n... 4 lines hidden ...\n' +
                'line7 <mark>match</mark>\n' +
                '\n... 1 lines hidden ...\n'
            );
        });
    });

    describe('Viewport with no matches', () => {
        it('should show everything when no matches found (invert of empty is empty)', () => {
            const document = 'line1\nline2\nline3';

            const output = html()
                .addLayer(
                    rangesForMatch(/nomatch/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(output, 'line1\nline2\nline3');
        });
    });

    describe('Viewport with overlapping syntax highlighting', () => {
        it('should maintain syntax highlighting within viewport', () => {
            const document = 'const x = 1;\nconst y = 2;\nconst z = 3;';

            // Simple word highlighting as "syntax"
            const output = html()
                .addLayer(
                    rangesForMatch(/const/g),
                    (content) => `<span class="keyword">${content}</span>`
                )
                .addLayer(
                    rangesForMatch(/y/g),
                    (content) => `<mark>${content}</mark>`,
                    'search'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('search'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(
                output,
                '...\n' +
                '<span class="keyword">const</span> <mark>y</mark> = 2;\n' +
                '...\n'
            );
        });
    });

    describe('Edge cases', () => {
        it('should handle match at start of file', () => {
            const document = 'match here\nline2\nline3';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(
                output,
                '<mark>match</mark> here\n' +
                '...\n'
            );
        });

        it('should handle match at end of file', () => {
            const document = 'line1\nline2\nmatch here';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(
                output,
                '...\n' +
                '<mark>match</mark> here'
            );
        });

        it('should handle single line document', () => {
            const document = 'match here';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(output, '<mark>match</mark> here');
        });

        it('should handle entire file matched', () => {
            const document = 'match\nmatch\nmatch';

            const output = html()
                .addLayer(
                    rangesForMatch(/match/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => '...\n' }
                )
                .render(document);

            strictEqual(
                output,
                '<mark>match</mark>\n' +
                '<mark>match</mark>\n' +
                '<mark>match</mark>'
            );
        });
    });

    describe('Grep-like use case', () => {
        it('should show matches with context like grep -C', () => {
            const document = [
                'line 1',
                'line 2',
                'line 3 ERROR occurred',
                'line 4',
                'line 5',
                'line 6',
                'line 7 WARNING found',
                'line 8',
                'line 9'
            ].join('\n');

            const output = html()
                .addLayer(
                    rangesForMatch(/ERROR|WARNING/g),
                    (content) => `<mark>${content}</mark>`,
                    'matches'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('matches'),
                        applyExpandTo('line', 2),
                        applyInvert()
                    ),
                    { replace: () => '\n--\n' }
                )
                .render(document);

            // ERROR on line 3 (index 2), ±2 context = lines 0-4
            // WARNING on line 7 (index 6), ±2 context = lines 4-8
            // They overlap at lines 4, so should be continuous
            strictEqual(
                output,
                'line 1\n' +
                'line 2\n' +
                'line 3 <mark>ERROR</mark> occurred\n' +
                'line 4\n' +
                'line 5\n' +
                'line 6\n' +
                'line 7 <mark>WARNING</mark> found\n' +
                'line 8\n' +
                'line 9'
            );
        });

        it('should support parameterized context lines via rangeFromOptions', () => {
            const document = [
                'line 1',
                'line 2 ERROR occurred',
                'line 3',
                'line 4',
                'line 5'
            ].join('\n');

            type ViewportOptions = { pattern?: RegExp; context?: number };

            const createViewport = () => string<ViewportOptions>()
                .addLayer(
                    rangesFromOptions(({ pattern }) => pattern ? rangesForMatch(pattern) : null),
                    null,
                    'matches'
                )
                .addLayer(
                    rangesFromOptions(({ context = 0 }) =>
                        rangesCompose(
                            rangesFromLayer('matches'),
                            applyExpandTo('line', context),
                            applyInvert()
                        )
                    ),
                    { replace: () => '...\n' }
                );

            // With 0 context lines
            const output0 = createViewport().render(document, { pattern: /ERROR/g, context: 0 });
            strictEqual(
                output0,
                '...\n' +
                'line 2 ERROR occurred\n' +
                '...\n'
            );

            // With 1 context line
            const output1 = createViewport().render(document, { pattern: /ERROR/g, context: 1 });
            strictEqual(
                output1,
                'line 1\n' +
                'line 2 ERROR occurred\n' +
                'line 3\n' +
                '...\n'
            );
        });
    });

    describe('Code folding simulation', () => {
        it('should show only function signatures, hiding bodies', () => {
            const document = [
                'function foo() {',
                '  // body',
                '  return 1;',
                '}',
                '',
                'function bar() {',
                '  // body',
                '  return 2;',
                '}'
            ].join('\n');

            // Match function declarations (just first line)
            const output = html()
                .addLayer(
                    rangesForMatch(/^function .+$/gm),
                    (content) => `<span class="signature">${content}</span>`,
                    'signatures'
                )
                .addLayer(
                    rangesCompose(
                        rangesFromLayer('signatures'),
                        applyExpandTo('line', 0),
                        applyInvert()
                    ),
                    { replace: () => ' { ... }\n' }
                )
                .render(document);

            // Each function declaration is on its own line, bodies are replaced
            strictEqual(
                output,
                '<span class="signature">function foo() {</span>\n' +
                ' { ... }\n' +
                '<span class="signature">function bar() {</span>\n' +
                ' { ... }\n'
            );
        });
    });

    describe('Diagnostic rendering with line numbers', () => {
        it('should render diagnostics with line numbers and underline markers', () => {
            const document =
                'function calculate(value) {\n' +
                '    if (value == null) {\n' +
                '        return 0;\n' +
                '    }\n' +
                '    return value * 2;\n' +
                '}\n';

            const output = html()
                // Hide lines outside viewport
                .addLayer(
                    rangesCompose(
                        rangesForMatch(/==/g),
                        applyExpandTo('line', 1),
                        applyInvert()
                    ),
                    { replace: () => '' },
                    'match'
                )
                // Add line numbers to lines within viewport
                .addLayer(
                    rangesForLines('line-content'),
                    { open: ({ data: line }) => `${line} | ` }
                )
                // Add diagnostic markers at end of lines with matches
                .addLayer(
                    rangesCompose(
                        rangesForMatch(/==/g),
                        applyCollapseTo('line-content-end')
                    ),
                    {
                        break: true,
                        replace: ({ line, range, lines }: any) => {
                            const matchStart = range.origin.start;
                            const lineStart = lines.getLineStart(matchStart);
                            const columnOffset = matchStart - lineStart;
                            const padding = ' '.repeat(line.toString().length);
                            return '\n' +
                                padding + ' : ' + ' '.repeat(columnOffset) + '~'.repeat(range.origin.end - range.origin.start) + '\n' +
                                padding + ' : ' + ' '.repeat(columnOffset) + 'Use strict equality (===) instead';
                        }
                    }
                )
                .render(document);

            strictEqual(
                output,
                '1 | function calculate(value) {\n' +
                '2 |     if (value == null) {\n' +
                '  :               ~~\n' +
                '  :               Use strict equality (===) instead\n' +
                '3 |         return 0;\n'
            );
        });
    });
});

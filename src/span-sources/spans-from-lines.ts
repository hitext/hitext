import type { GenerateSpans } from '../types.js';

/**
 * Creates a span generator for line-based spans in various formats.
 *
 * @param type - The type of line span to generate:
 *   - 'line': Full lines including newline characters (data = line number) [default]
 *   - 'line-content': Line content without newline characters (data = line number)
 *   - 'newline': Only the newline characters themselves (data = line number)
 *   - 'line-start': Zero-length spans at the start of each line (data = line number)
 *   - 'line-end': Zero-length spans at the end of each line, after newline (data = line number)
 *   - 'line-content-end': Zero-length spans at the end of line content, before newline (data = line number)
 *
 * @returns A GenerateSpans function that creates spans for each line
 *
 * @example
 * spansFromLines()
 *
 * @example
 * spansFromLines('line-content')
 */
export function spansFromLines<RenderOptions = unknown>(
    type:
        | 'line'
        | 'line-content'
        | 'newline'
        | 'line-start'
        | 'line-end'
        | 'line-content-end'
    = 'line'
): GenerateSpans<number, RenderOptions> {
    return (document, createSpan) => {
        const newlineRegex = /\r\n|\r|\n/g;
        let lineNum = 1;
        let lineStart = 0;
        let match;

        while ((match = newlineRegex.exec(document))) {
            const newlineStart = match.index;
            const newlineEnd = match.index + match[0].length;

            switch (type) {
                case 'line':
                    createSpan(lineStart, newlineEnd, lineNum);
                    break;
                case 'line-content':
                    createSpan(lineStart, newlineStart, lineNum);
                    break;
                case 'newline':
                    createSpan(newlineStart, newlineEnd, lineNum);
                    break;
                case 'line-start':
                    createSpan(lineStart, lineStart, lineNum);
                    break;
                case 'line-end':
                    createSpan(newlineEnd, newlineEnd, lineNum);
                    break;
                case 'line-content-end':
                    createSpan(newlineStart, newlineStart, lineNum);
                    break;
            }

            lineNum++;
            lineStart = newlineEnd;
        }

        // Handle the final line (after the last newline or the entire document if no newlines)
        switch (type) {
            case 'line':
            case 'line-content':
                createSpan(lineStart, document.length, lineNum);
                break;
            case 'line-start':
                createSpan(lineStart, lineStart, lineNum);
                break;
            case 'line-end':
            case 'line-content-end':
                createSpan(document.length, document.length, lineNum);
                break;
            case 'newline':
                // No final span for newline type if document doesn't end with newline
                break;
        }
    };
}

import type { GenerateRanges } from '../types.js';

/**
 * Creates a range generator for line-based ranges in various formats.
 *
 * @param type - The type of line range to generate:
 *   - 'line': Full lines including newline characters (data = line number) [default]
 *   - 'line-content': Line content without newline characters (data = line number)
 *   - 'newline': Only the newline characters themselves (data = line number)
 *   - 'line-start': Zero-length ranges at the start of each line (data = line number)
 *   - 'line-end': Zero-length ranges at the end of each line, after newline (data = line number)
 *   - 'line-content-end': Zero-length ranges at the end of line content, before newline (data = line number)
 *
 * @returns A GenerateRanges function that creates ranges for each line
 *
 * @example
 * ```typescript
 * // Generate ranges for full lines (including newlines) - default
 * rangesForLines()
 * rangesForLines('line')
 *
 * // Generate ranges for line content only (excluding newlines)
 * rangesForLines('line-content')
 *
 * // Generate ranges for newline characters only
 * rangesForLines('newline')
 *
 * // Generate zero-length ranges at line boundaries
 * rangesForLines('line-start')
 * rangesForLines('line-end')
 * rangesForLines('line-content-end')
 * ```
 */
export function rangesForLines<RenderOptions = unknown>(
    type:
        | 'line'
        | 'line-content'
        | 'newline'
        | 'line-start'
        | 'line-end'
        | 'line-content-end'
    = 'line'
): GenerateRanges<number, RenderOptions> {
    return (source, createRange) => {
        const newlineRegex = /\r\n|\r|\n/g;
        let lineNum = 1;
        let lineStart = 0;
        let match;

        while ((match = newlineRegex.exec(source))) {
            const newlineStart = match.index;
            const newlineEnd = match.index + match[0].length;

            switch (type) {
                case 'line':
                    createRange(lineStart, newlineEnd, lineNum);
                    break;
                case 'line-content':
                    createRange(lineStart, newlineStart, lineNum);
                    break;
                case 'newline':
                    createRange(newlineStart, newlineEnd, lineNum);
                    break;
                case 'line-start':
                    createRange(lineStart, lineStart, lineNum);
                    break;
                case 'line-end':
                    createRange(newlineEnd, newlineEnd, lineNum);
                    break;
                case 'line-content-end':
                    createRange(newlineStart, newlineStart, lineNum);
                    break;
            }

            lineNum++;
            lineStart = newlineEnd;
        }

        // Handle the final line (after the last newline or the entire source if no newlines)
        switch (type) {
            case 'line':
            case 'line-content':
                createRange(lineStart, source.length, lineNum);
                break;
            case 'line-start':
                createRange(lineStart, lineStart, lineNum);
                break;
            case 'line-end':
            case 'line-content-end':
                createRange(source.length, source.length, lineNum);
                break;
            case 'newline':
                // No final range for newline type if source doesn't end with newline
                break;
        }
    };
}

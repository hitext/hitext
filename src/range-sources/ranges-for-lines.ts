import type { GenerateRanges } from '../types.js';

/**
 * Creates a range generator for line-based ranges in various formats.
 *
 * @param type - The type of line range to generate:
 *   - 'line': Full lines including newline characters (data = line number)
 *   - 'line-content': Line content without newline characters (data = line number)
 *   - 'newline': Only the newline characters themselves (data = line number)
 *
 * @returns A GenerateRanges function that creates ranges for each line
 *
 * @example
 * ```typescript
 * // Generate ranges for full lines (including newlines)
 * rangesForLines('line')
 *
 * // Generate ranges for line content only (excluding newlines)
 * rangesForLines('line-content')
 *
 * // Generate ranges for newline characters only
 * rangesForLines('newline')
 * ```
 */
export function rangesForLines<RenderOptions = unknown>(
    type: 'line' | 'line-content' | 'newline'
): GenerateRanges<number, RenderOptions> {
    switch (type) {
        case 'line':
            return (source, createRange) => {
                const newlineRegex = /\r\n|\r|\n/g;
                let line = 1;
                let lineStart = 0;
                let match;

                while ((match = newlineRegex.exec(source))) {
                    createRange(lineStart, match.index + match[0].length, line++);
                    lineStart = match.index + match[0].length;
                }

                createRange(lineStart, source.length, line++);
            };

        case 'line-content':
            return (source, createRange) => {
                const newlineRegex = /\r\n|\r|\n/g;
                let line = 1;
                let lineStart = 0;
                let match;

                while ((match = newlineRegex.exec(source))) {
                    createRange(lineStart, match.index, line++);
                    lineStart = match.index + match[0].length;
                }

                createRange(lineStart, source.length, line++);
            };

        case 'newline':
            return (source, createRange) => {
                const newlineRegex = /\r\n|\r|\n/g;
                let line = 1;
                let match;

                while ((match = newlineRegex.exec(source))) {
                    createRange(match.index, match.index + match[0].length, line++);
                }
            };
    }
}

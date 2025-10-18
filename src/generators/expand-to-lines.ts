import type { GenerateRanges, Ranges } from '../types.js';
import { generateRanges } from '../ranges.js';

export function rangeExpandToLines<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    lines = 0
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const ranges = generateRanges(source, input, Symbol('temp'), renderOptions);

        if (ranges.length === 0) {
            return;
        }

        // Pass 1: Build line lengths vector
        const lineLengths: number[] = [];
        const newlineRegex = /\r\n|\r|\n/g;
        let lineStart = 0;
        let match;

        while ((match = newlineRegex.exec(source))) {
            const lineEnd = match.index + match[0].length;
            lineLengths.push(lineEnd - lineStart);
            lineStart = lineEnd;
        }

        // Last line (if there's content after last newline or no newlines at all)
        if (lineStart < source.length) {
            lineLengths.push(source.length - lineStart);
        }

        // Pass 2: Mark used lines from ranges
        const usedLines = new Uint8Array(lineLengths.length);
        let acc = 0; // accumulator storing offset after last processed line
        let lineIdx = 0;

        for (const range of ranges) {
            // Advance accumulator to range.start
            while (lineIdx < lineLengths.length && acc + lineLengths[lineIdx] <= range.start) {
                acc += lineLengths[lineIdx];
                lineIdx++;
            }

            // Mark lines until range.end
            while (lineIdx < lineLengths.length && acc < range.end) {
                usedLines[lineIdx] = 1;
                acc += lineLengths[lineIdx];
                lineIdx++;
            }
        }

        // Pass 3: Add padding (context lines)
        if (lines > 0) {
            // Forward pass: pad lines after used lines
            let acc = 0;
            for (let i = 0; i < usedLines.length; i++) {
                if (usedLines[i]) {
                    acc = lines;
                } else if (acc > 0) {
                    usedLines[i] = 1;
                    acc--;
                }
            }

            // Backward pass: pad lines before used lines
            acc = 0;
            for (let i = usedLines.length - 1; i >= 0; i--) {
                if (usedLines[i]) {
                    acc = lines;
                } else if (acc > 0) {
                    usedLines[i] = 1;
                    acc--;
                }
            }
        }

        // Pass 4: Build ranges from adjacent marked lines
        let offset = 0;
        let rangeStart = -1;

        for (let i = 0; i < usedLines.length; i++) {
            if (usedLines[i]) {
                if (rangeStart === -1) {
                    rangeStart = offset;
                }
            } else if (rangeStart !== -1) {
                createRange(rangeStart, offset);
                rangeStart = -1;
            }
            offset += lineLengths[i];
        }

        // Emit final range if still open
        if (rangeStart !== -1) {
            createRange(rangeStart, offset);
        }
    };
}

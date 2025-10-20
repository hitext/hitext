import type { GenerateRanges, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { getSharedLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Fits ranges horizontally into a maximum window width.
 * Useful for creating focused viewports within long lines for display purposes.
 *
 * The function balances expansion for small ranges:
 * - Tries to add equal space on both sides
 * - If one side hits line boundary, gives excess space to the other side
 * - Respects line boundaries (doesn't cross newlines within the same line)
 *
 * For ranges that exceed the window size:
 * - Can trim from the right to fit (if allowTrimming=true)
 *
 * Note: Multiline ranges are automatically trimmed to the first line only,
 * since horizontal fitting only makes sense for single-line content.
 *
 * @param input - Ranges to fit into window
 * @param size - Maximum window width in characters (default: 80)
 * @param allowTrimming - Whether to trim single-line ranges longer than size (default: true)
 *
 * @example
 * // Fit small range into 80-char window
 * rangeFitToWindow(rangeMatch(/error/g), 80)
 * // "...some context error more context..."
 *
 * @example
 * // Preserve long ranges
 * rangeFitToWindow(rangeMatch(/very long match/g), 20, false)
 */
export function rangeFitToWindow<Data, RenderOptions>(
    input: Ranges<Data, RenderOptions>,
    size: number = 80,
    allowTrimming: boolean = true
): GenerateRanges<Data, RenderOptions> {
    return (source, createRange, renderOptions) => {
        const lineBoundaries = getSharedLineBoundaries(source);

        processRanges(
            source,
            input,
            (start, end, data, origin) => {
                let windowStart = start;
                let windowEnd = end;

                // Check if range spans multiple lines
                const rangeStartLine = lineBoundaries.getLine(start);
                const rangeEndLine = lineBoundaries.getLine(end > start ? end - 1 : end);
                const isMultiline = rangeEndLine > rangeStartLine;

                // Trim multiline ranges to first line only
                if (isMultiline) {
                    end = lineBoundaries.getLineContentEnd(start);
                }

                // Find the line containing this range (now guaranteed to be single-line)
                const lineStart = lineBoundaries.getLineStart(start);
                const lineEnd = lineBoundaries.getLineContentEnd(end > start ? end - 1 : end);

                // Calculate range length
                const rangeLength = end - start;

                // Case 1: Range fits within window size - expand symmetrically
                if (rangeLength <= size) {
                    const room = size - rangeLength;
                    const idealLeft = Math.floor(room / 2);
                    const idealRight = room - idealLeft;

                    // Calculate available space on each side
                    const availableLeft = start - lineStart;
                    const availableRight = lineEnd - end;

                    // Try to expand symmetrically, respecting line boundaries
                    let actualLeft = Math.min(idealLeft, availableLeft);
                    let actualRight = Math.min(idealRight, availableRight);

                    // If one side couldn't expand fully, give excess to other side
                    if (actualLeft < idealLeft) {
                        const excess = idealLeft - actualLeft;
                        actualRight = Math.min(actualRight + excess, availableRight);
                    } else if (actualRight < idealRight) {
                        const excess = idealRight - actualRight;
                        actualLeft = Math.min(actualLeft + excess, availableLeft);
                    }

                    windowStart = start - actualLeft;
                    windowEnd = end + actualRight;
                } else if (allowTrimming) {
                    // Case 2: Range is larger than window - trim from right if allowed
                    windowEnd = start + size;
                } else {
                    // Case 3: Range is larger but trimming disabled - keep as is
                }

                createRange(windowStart, windowEnd, data, origin || { start, end, data });
            },
            renderOptions
        );
    };
}

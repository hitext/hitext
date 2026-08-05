import type { SpansSource, TransformSpans } from '../types.js';
import { processSpans } from '../spans.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Fits spans horizontally into a maximum window width (curried transformer).
 * Useful for creating focused viewports within long lines for display purposes.
 *
 * The function balances expansion for small spans:
 * - Tries to add equal space on both sides
 * - If one side hits line boundary, gives excess space to the other side
 * - Respects line boundaries (doesn't cross newlines within the same line)
 *
 * For spans that exceed the window size:
 * - Can trim from the right to fit (if allowTrimming=true)
 *
 * Note: Multiline spans are automatically trimmed to the first line only,
 * since horizontal fitting only makes sense for single-line content.
 *
 * @param size - Maximum window width in characters (default: 80)
 * @param allowTrimming - Whether to trim single-line spans longer than size (default: true)
 * @returns A transformer function that accepts spans and returns fitted spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyFitToWindow(80)
 * )
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyFitToWindow(120, false)
 * )
 */
export function applyFitToWindow<Data, RenderOptions>(
    size: number = 80,
    allowTrimming: boolean = true
): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            const lineBoundaries = context?.lines || createLineBoundaries(document);

            processSpans(
                document,
                input,
                (start, end, data, origin) => {
                    const spanOrigin = origin || { start, end, data };
                    let windowStart = start;

                    // Check if span spans multiple lines
                    const spanStartLine = lineBoundaries.getLine(start);
                    const spanEndLine = lineBoundaries.getLine(end > start ? end - 1 : end);
                    const isMultiline = spanEndLine > spanStartLine;

                    // Trim multiline spans to first line only
                    if (isMultiline) {
                        end = lineBoundaries.getLineContentEnd(start);
                    }

                    let windowEnd = end;

                    // Find the line containing this span (now guaranteed to be single-line)
                    const lineStart = lineBoundaries.getLineStart(start);
                    const lineEnd = lineBoundaries.getLineContentEnd(end > start ? end - 1 : end);

                    // Calculate span length
                    const spanLength = end - start;

                    // Case 1: Span fits within window size - expand symmetrically
                    if (spanLength <= size) {
                        const room = size - spanLength;
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
                        // Case 2: Span is larger than window - trim from right if allowed
                        windowEnd = start + size;
                    } else {
                        // Case 3: Span is larger but trimming disabled - keep as is
                    }

                    createSpan(windowStart, windowEnd, data, spanOrigin);
                },
                context
            );
        };
    };
}

import { processSpans } from '../spans.js';
import type { GenerateSpans, SpansSource } from '../types.js';

/**
 * Creates a span generator that tries multiple inputs in order, using the first one that produces spans.
 *
 * This is useful for providing fallback behavior when span sources may yield no results.
 * Each input is tried in order until one produces spans, or all inputs are exhausted.
 *
 * @param inputs - Span sources to try in order (generator functions or iterables)
 * @returns A GenerateSpans function that tries each input until one produces spans
 *
 * @example
 * spansWithFallback(
 *   spansFromMatch(/error/gi),
 *   spansFromMatch(/warning/gi),
 *   [[0, 100]]
 * )
 */
export function spansWithFallback<Data = unknown, RenderOptions = unknown>(
    ...inputs: SpansSource<Data, RenderOptions>[]
): GenerateSpans<Data, RenderOptions> {
    return (document, createSpan, context) => {
        // Try each input in order until one produces spans
        for (const input of inputs) {
            let hasSpans = false;

            processSpans(
                document,
                input,
                (start, end, data, origin) => {
                    hasSpans = true;
                    createSpan(start, end, data, origin);
                },
                context
            );

            // If this input produced spans, we're done
            if (hasSpans) {
                break;
            }
        }
    };
}

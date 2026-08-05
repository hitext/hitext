import type { SpansSource, TransformSpans } from '../types.js';
import { generateSpans } from '../spans.js';

/**
 * Sorts spans and merges each overlapping or adjacent group (curried transformer).
 *
 * Each output has undefined data and an origin array containing the normalized
 * input records in its group.
 *
 * @returns A transformer function that accepts spans and returns merged spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyExpandTo('line'),
 *   applyMerge()
 * )
 */
export function applyMerge<Data, RenderOptions>(): TransformSpans<Data, RenderOptions, undefined> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            const sortedSpans = generateSpans(document, input, context as any)
                .sort((a, b) => a.start - b.start || a.end - b.end);

            let firstIndex = 0;
            let lastIndex = 0;

            // Helper to create a merged span with origin tracking
            const createMergedSpan = (start: number, end: number) => {
                const origin = sortedSpans.slice(firstIndex, lastIndex + 1).map(
                    ({ start, end, data, origin }) => ({ start, end, data, origin })
                );
                createSpan(start, end, undefined, origin);
            };

            if (sortedSpans.length > 0) {
                let end = sortedSpans[firstIndex].end;

                for (let i = 1; i < sortedSpans.length; i++) {
                    const span = sortedSpans[i];

                    if (span.start <= end) {
                        lastIndex = i;
                        end = Math.max(span.end, end);
                    } else {
                        createMergedSpan(sortedSpans[firstIndex].start, end);
                        firstIndex = lastIndex = i;
                        end = span.end;
                    }
                }

                createMergedSpan(sortedSpans[firstIndex].start, end);
            }
        };
    };
}

import type { SpansSource, TransformSpans } from '../types.js';
import { generateSpans } from '../spans.js';

/**
 * Merges overlapping or adjacent spans into continuous regions (curried transformer).
 *
 * Preserves the array of merged spans in the origin field, which allows you to
 * access the individual spans that were combined. This is useful for:
 * - Generating summaries (e.g., table of contents from merged headers)
 * - Tracking what was merged together for further processing
 * - Maintaining data from individual spans after merging positions
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
export function applyMerge<Data, RenderOptions>(): TransformSpans<Data, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, context) => {
            const sortedSpans = generateSpans(document, input, context)
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

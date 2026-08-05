import type { GenerateSpans, SpansSource, SpanRecord } from '../types.js';
import { processSpans } from '../spans.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Creates padding spans to make lines square (curried transformer).
 *
 * @param lines - Number of lines to add, or [linesBefore, linesAfter]
 * @param size - Target width for each line
 * @returns A transformer function that accepts spans and returns padding spans
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyPadLines([1, 1], 80)
 * )
 *
 * @example
 * spansCompose(
 *   ...,
 *   applyPadLines(2, 100)
 * )
 */
export function applyPadLines<Data, RenderOptions>(
    lines: number | [number, number],
    size: number
): (input: SpansSource<Data, RenderOptions>) => GenerateSpans<number, RenderOptions> {
    return (input: SpansSource<Data, RenderOptions>) => {
        return (document, createSpan, genContext) => {
            const spans: Array<SpanRecord<Data>> = [];
            processSpans(document, input, (start, end, data, origin) => {
                spans.push({ start, end, data, origin });
            }, genContext as any);

            if (spans.length === 0) {
                return;
            }

            const lineBoundaries = createLineBoundaries(document);
            const [linesBefore, linesAfter] = typeof lines === 'number' ? [0, lines] : lines;

            for (const origSpan of spans) {
                for (let i = -linesBefore; i <= linesAfter; i++) {
                    const lineStart = lineBoundaries.getLineStart(origSpan.start, i);
                    const lineEnd = lineBoundaries.getLineContentEnd(origSpan.start, i);
                    const spanStart = lineStart;
                    const spanEnd = Math.min(lineStart + size, lineEnd);
                    const paddingNeeded = size - (spanEnd - spanStart);

                    createSpan(spanStart, spanEnd, paddingNeeded, origSpan as any);
                }
            }
        };
    };
}

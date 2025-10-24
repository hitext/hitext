import type { RangeRecord, RangeOperationContext, GenerateRangesContext, Ranges } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from './line-boundaries.js';

/**
 * Creates a RangeOperationContext for use in range transformation callbacks.
 *
 * This helper standardizes context creation across transformers that need to provide
 * stable context to user callbacks (filter, map, sort, pick, etc.).
 *
 * @param document - The document text
 * @param ranges - Array of collected ranges
 * @param genContext - Optional generation context for reusing lines/renderOptions
 * @returns A RangeOperationContext with index initialized to 0
 */
export function createRangeOperationContext<Data, RenderOptions>(
    document: string,
    ranges: Array<RangeRecord<Data>>,
    genContext?: GenerateRangesContext<Data, RenderOptions>
): RangeOperationContext<RenderOptions> & { index: number } {
    return {
        document,
        lines: genContext?.lines || createLineBoundaries(document),
        renderOptions: genContext?.renderOptions,
        ranges,
        index: 0
    };
}

/**
 * Collects ranges and executes a callback with ranges and operation context.
 * Handles empty ranges case automatically (callback not invoked if no ranges).
 * This helper is preferred for transformers as it provides cleaner control flow.
 *
 * @param document - The document text
 * @param input - Range input to collect
 * @param context - Generation context
 * @param callback - Function to execute with collected ranges and operation context
 */
export function processRangesWithContext<Data, RenderOptions>(
    document: string,
    input: Ranges<Data, RenderOptions>,
    context: GenerateRangesContext<Data, RenderOptions> | undefined,
    callback: (
        ranges: Array<RangeRecord<Data>>,
        opContext: RangeOperationContext<RenderOptions>
    ) => void
): void {
    const ranges: Array<RangeRecord<Data>> = [];
    processRanges(document, input, (start, end, data, origin) => {
        ranges.push({ start, end, data, origin });
    }, context);

    // Early exit if no ranges
    if (ranges.length === 0) {
        return;
    }

    const opContext = createRangeOperationContext(document, ranges, context);
    callback(ranges, opContext);
}

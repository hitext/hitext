import type {
    Ranges,
    RangeRecord,
    RangeOperationContext,
    TransformRanges,
    CreateRange,
    GenerateRangesContext
} from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Augments ranges by passing them through unchanged and emitting additional ranges (curried transformer).
 * Original ranges preserve their data and origin. Additional ranges become derivatives.
 *
 * The augmenter receives:
 * - `range` - The source range object with start, end, data, and origin
 * - `createRange` - Callback to emit additional ranges (derivatives with automatic origin tracking)
 * - `opContext` - Operation context with document, lines, renderOptions, ranges, and index
 *
 * **Use Case**: When you want to keep the original ranges and add related ranges around them
 * (e.g., add decorations, markers, or context without modifying the originals).
 *
 * **Origin Tracking**: Original ranges pass through unchanged. Additional ranges inherit
 * `range.origin || range` as their origin.
 *
 * @param augmenter - Function that emits additional ranges (originals passed through automatically)
 * @returns A transformer function that accepts ranges and returns augmented ranges
 *
 * @example
 * // Add line-start marker for each error
 * rangesCompose(...,
 *   applyAugment((range, createRange, { lines }) => {
 *     const lineStart = lines.getLineStart(range.start);
 *     createRange(lineStart, lineStart, { type: 'line-marker' });
 *   })
 * )
 */
export function applyAugment<Data, RenderOptions>(
    augmenter: (
        range: RangeRecord<Data>,
        createRange: (start: number, end: number, data?: Data) => void,
        opContext: RangeOperationContext<RenderOptions>
    ) => void
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (
            document: string,
            createRange: CreateRange<Data>,
            context: GenerateRangesContext<Data, RenderOptions> | undefined
        ) => {
            processRangesWithContext(document, input, context, (ranges, opContext) => {
                for (let i = 0; i < ranges.length; i++) {
                    const range = ranges[i];
                    opContext.index = i;

                    // Pass through original range unchanged
                    createRange(range.start, range.end, range.data, range.origin);

                    // Automatic origin tracking for additional ranges
                    const origin = range.origin || { start: range.start, end: range.end, data: range.data };

                    // Create wrapper that automatically adds origin to additional ranges
                    const createRangeWithOrigin = (
                        start: number,
                        end: number,
                        data?: Data
                    ) => {
                        createRange(start, end, data, origin as any);
                    };

                    // Emit any additional ranges from user
                    augmenter(range, createRangeWithOrigin, opContext);
                }
            });
        };
    };
}

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
 * Maps each range to zero or more new ranges (curried transformer).
 * This is the core 1-to-N primitive for range transformation.
 *
 * The mapper receives:
 * - \`range\` - The source range object with start, end, data, and origin
 * - \`createRange\` - Callback to emit new ranges
 * - \`opContext\` - Operation context with document, lines, renderOptions, ranges, and index
 *
 * **Origin Tracking**: Automatically preserves range lineage. New ranges inherit
 * \`range.origin || range\` as their origin, maintaining the root reference through
 * transformation chains.
 *
 * **Key Difference from applyDataMap**: While applyDataMap preserves positions and
 * transforms data (1-to-1), applyMap allows creating any number of ranges with
 * different positions (1-to-N).
 *
 * @param mapper - Function that maps each range to zero or more new ranges
 * @returns A transformer function that accepts ranges and returns mapped ranges
 *
 * @example
 * // Split each range into start and end markers
 * applyMap((range, createRange) => {
 *   createRange(range.start, range.start + 1);  // opening marker
 *   createRange(range.end - 1, range.end);      // closing marker
 * })
 *
 * @example
 * // Filter and transform: only emit if condition met
 * applyMap((range, createRange, { document }) => {
 *   const text = document.slice(range.start, range.end);
 *   if (text.includes('error')) {
 *     createRange(range.start, range.end, 'ERROR');
 *   }
 * })
 */
export function applyMap<InputData, OutputData, RenderOptions>(
    mapper: (
        range: RangeRecord<InputData>,
        createRange: (start: number, end: number, data?: OutputData) => void,
        opContext: RangeOperationContext<RenderOptions>
    ) => void
): TransformRanges<OutputData, RenderOptions> {
    return ((input: Ranges<InputData, RenderOptions>) => {
        return (
            document: string,
            createRange: CreateRange<OutputData>,
            context: GenerateRangesContext<OutputData, RenderOptions> | undefined
        ) => {
            processRangesWithContext(document, input, context as any, (ranges, opContext) => {
                for (let i = 0; i < ranges.length; i++) {
                    const range = ranges[i];
                    opContext.index = i;

                    // Automatic origin tracking: preserve root reference
                    const origin = range.origin || { start: range.start, end: range.end, data: range.data };

                    // Create wrapper that automatically adds origin
                    const createRangeWithOrigin = (
                        start: number,
                        end: number,
                        data?: OutputData
                    ) => {
                        createRange(start, end, data, origin as any);
                    };

                    mapper(range, createRangeWithOrigin, opContext);
                }
            });
        };
    }) as any;
}

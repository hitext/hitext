import type { Ranges, RangeRecord, RangeOperationContext, TransformRanges } from '../types.js';
import { processRangesWithContext } from '../utils/range-operation-context.js';

/**
 * Picks a single range from the input based on a selector (curried transformer).
 *
 * @param selector - How to pick the range ('first', 'last', or predicate function)
 * @returns A transformer function that accepts ranges and returns a single picked range
 *
 * @example
 * rangesCompose(
 *   ...,
 *   applyPick('first')
 * )
 *
 * @example
 * rangesCompose(
 *   diagnostics,
 *   applyPick((range) => range.data.severity === 'error')
 * )
 */
export function applyPick<Data, RenderOptions>(
    selector: 'first' | 'last' | ((
        range: RangeRecord<Data>,
        opContext: RangeOperationContext<RenderOptions>
    ) => boolean)
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (document, createRange, context) => {
            processRangesWithContext(document, input, context, (ranges, opContext) => {
                let picked: RangeRecord<Data> | null = null;

                if (selector === 'first') {
                    picked = ranges[0];
                } else if (selector === 'last') {
                    picked = ranges[ranges.length - 1];
                } else {
                    for (let i = 0; i < ranges.length; i++) {
                        opContext.index = i;

                        if (selector(ranges[i], opContext)) {
                            picked = ranges[i];
                            break;
                        }
                    }
                }

                if (picked) {
                    createRange(picked.start, picked.end, picked.data, picked.origin);
                }
            });
        };
    };
}

import type { Ranges, RangeRecord, RangeOperationContext, TransformRanges } from '../types.js';
import { processRanges } from '../ranges.js';
import { createLineBoundaries } from '../utils/line-boundaries.js';

/**
 * Picks a single range from the input based on a selector (curried transformer).
 *
 * @param selector - How to pick the range ('first', 'last', or predicate function)
 * @returns A transformer function that accepts ranges and returns a single picked range
 *
 * @example
 * // Pick first range
 * composeRanges(ranges, applyPick('first'))
 *
 * @example
 * // Pick first error diagnostic
 * composeRanges(
 *   diagnostics,
 *   applyPick((range) => range.data.severity === 'error')
 * )
 */
export function applyPick<Data, RenderOptions>(
    selector: 'first' | 'last' | ((
        range: RangeRecord<Data>,
        index: number,
        context: RangeOperationContext<RenderOptions>
    ) => boolean)
): TransformRanges<Data, RenderOptions> {
    return (input: Ranges<Data, RenderOptions>) => {
        return (source, createRange, genContext) => {
            const ranges: Array<RangeRecord<Data>> = [];
            processRanges(source, input, (start, end, data, origin) => {
                ranges.push({ start, end, data, origin });
            }, genContext as any);

            if (ranges.length === 0) {
                return;
            }

            let picked: RangeRecord<Data> | null = null;

            if (selector === 'first') {
                picked = ranges[0];
            } else if (selector === 'last') {
                picked = ranges[ranges.length - 1];
            } else {
                const context: RangeOperationContext<RenderOptions> = {
                    source,
                    lines: genContext?.lines || createLineBoundaries(source),
                    renderOptions: genContext?.renderOptions,
                    ranges
                };

                for (let index = 0; index < ranges.length; index++) {
                    if (selector(ranges[index], index, context)) {
                        picked = ranges[index];
                        break;
                    }
                }
            }

            if (picked) {
                createRange(picked.start, picked.end, picked.data, picked.origin);
            }
        };
    };
}

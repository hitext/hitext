import { processRanges } from '../ranges.js';
import type { GenerateRanges, Ranges, RangeIterable, RangesGenerator } from '../types.js';

/**
 * Document keyword for generating predefined document-level ranges.
 */
export type DocumentKeyword = 'document' | 'document-start' | 'document-end';

/**
 * Normalizes various input formats into a GenerateRanges function.
 *
 * Supports:
 * - Document keywords:
 *   - `'document'`: Full document range `[0, document.length]`
 *   - `'document-start'`: Zero-length range at document start `[0, 0]`
 *   - `'document-end'`: Zero-length range at document end `[document.length, document.length]`
 * - Generator functions: `function*(document, renderOptions) { yield [0, 10]; }`
 * - Functions returning iterables: `(document, renderOptions) => [[0, 10], [20, 30]]`
 * - Functions returning GenerateRanges: `() => (document, createRange, renderOptions) => { ... }`
 * - Iterables: `[[0, 10], [20, 30]]`
 *
 * @param input - The input to normalize
 * @returns A GenerateRanges function
 *
 * @example
 * rangesFrom('document')
 *
 * @example
 * rangesFrom([[0, 10], [20, 30]])
 *
 * @example
 * rangesFrom((document) => [[0, document.length]])
 */
export function rangesFrom<Data = unknown, RenderOptions = unknown>(
    input: DocumentKeyword | RangeIterable<Data> | RangesGenerator<Data, RenderOptions>
): GenerateRanges<Data, RenderOptions> {
    return (document, createRange, context) => {
        // Handle document keywords
        if (typeof input === 'string') {
            switch (input) {
                case 'document':
                    createRange(0, document.length);
                    return;
                case 'document-start':
                    createRange(0, 0);
                    return;
                case 'document-end':
                    createRange(document.length, document.length);
                    return;
            }
        }

        const ranges: Ranges<Data, RenderOptions> = typeof input === 'function'
            ? input(document, context?.renderOptions)
            : input;

        processRanges(document, ranges, createRange, context);
    };
}

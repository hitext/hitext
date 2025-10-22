import type { GenerateRanges } from '../types.js';

/**
 * Creates a range generator for zero-length ranges at document boundaries.
 *
 * Generates a single zero-length range (where start === end) at either the
 * beginning or end of the document. Useful for inserting content at document
 * boundaries using hooks like `open` or `close`.
 *
 * @param position - The document boundary position:
 *   - 'document-start': Zero-length range at position 0 (start of document)
 *   - 'document-end': Zero-length range at source.length (end of document)
 *
 * @returns A GenerateRanges function that creates a single zero-length range
 *
 * The data stored in the range is `null`.
 *
 * @example
 * ```typescript
 * // Insert content at document start
 * html()
 *   .addLayer(
 *     rangesForPoint('document-start'),
 *     { open: () => '<header>Document Header</header>\n' }
 *   )
 */
export function rangesForPoint<RenderOptions = unknown>(
    position: 'document-start' | 'document-end'
): GenerateRanges<null, RenderOptions> {
    return (source, createRange) => {
        const point = position === 'document-start' ? 0 : source.length;
        createRange(point, point, null);
    };
}

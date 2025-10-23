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
 *   - 'document-end': Zero-length range at document.length (end of document)
 *
 * @returns A GenerateRanges function that creates a single zero-length range
 *
 * The data stored in the range is `null`.
 *
 * @example
 * pipeline.addLayer(
 *   rangesForPoint('document-start'),
 *   { open: () => '<header>...</header>' }
 * )
 */
export function rangesForPoint<RenderOptions = unknown>(
    position: 'document-start' | 'document-end'
): GenerateRanges<null, RenderOptions> {
    return (document, createRange) => {
        const point = position === 'document-start' ? 0 : document.length;
        createRange(point, point, null);
    };
}

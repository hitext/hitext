import { processSpans } from '../spans.js';
import type { GenerateSpans, SpansSource, SpansIterable, SpansSourceFactory } from '../types.js';

/**
 * Document keyword for generating predefined document-level spans.
 */
export type DocumentKeyword = 'document' | 'document-start' | 'document-end';

/**
 * Normalizes various input formats into a GenerateSpans function.
 *
 * Supports:
 * - Document keywords:
 *   - `'document'`: Full document span `[0, document.length]`
 *   - `'document-start'`: Zero-length span at document start `[0, 0]`
 *   - `'document-end'`: Zero-length span at document end `[document.length, document.length]`
 * - Generator functions: `function*(document, renderOptions) { yield [0, 10]; }`
 * - Functions returning iterables: `(document, renderOptions) => [[0, 10], [20, 30]]`
 * - Functions returning GenerateSpans: `() => (document, createSpan, renderOptions) => { ... }`
 * - Iterables: `[[0, 10], [20, 30]]`
 *
 * @param input - The input to normalize
 * @returns A GenerateSpans function
 *
 * @example
 * spansFrom('document')
 *
 * @example
 * spansFrom([[0, 10], [20, 30]])
 *
 * @example
 * spansFrom((document) => [[0, document.length]])
 */
export function spansFrom<Data = unknown, RenderOptions = unknown>(
    input: DocumentKeyword | SpansIterable<Data> | SpansSourceFactory<Data, RenderOptions>
): GenerateSpans<Data, RenderOptions> {
    return (document, createSpan, context) => {
        // Handle document keywords
        if (typeof input === 'string') {
            switch (input) {
                case 'document':
                    createSpan(0, document.length);
                    return;
                case 'document-start':
                    createSpan(0, 0);
                    return;
                case 'document-end':
                    createSpan(document.length, document.length);
                    return;
            }
        }

        const spans: SpansSource<Data, RenderOptions> = typeof input === 'function'
            ? input(document, context?.renderOptions)
            : input;

        processSpans(document, spans, createSpan, context);
    };
}

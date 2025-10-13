import { createPipelineForPrinter } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

export function createHtmlPrinter() {
    return createPipelineForPrinter(() => {
        return {
            createBuffer: () => new StringBuffer(),
            text: (chunk: string) => chunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
        };
    });
}

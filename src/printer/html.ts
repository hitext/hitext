import { createPrinter } from './utils';

export default createPrinter({
    print: (chunk: string) => chunk
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
});

import * as generators from './generator/index.js';
import { string, html, dom, tty } from './printer/index.js';
import { createPipelineForPrinter } from './pipeline.js';
import print from './print.js';

// exports
export type * from './types.d.js';
export {
    generators as generator,

    // printer
    string,
    html,
    dom,
    tty,

    // helpers
    createPipelineForPrinter,
    print
};

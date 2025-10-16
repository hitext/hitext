import { textHitext } from './test.js';

describe('ESM bundles', () => {
    const modules = [
        '../hitext.esm.js',
        '../hitext.esm.min.js'
    ];

    for (const mod of modules) {
        it(mod, async () => {
            const hitext = await import(mod);

            textHitext(hitext);
        });
    }
});

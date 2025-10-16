/* global hitext */
import fs from 'fs';
import { textHitext } from './test.js';

describe('dist/hitext.umd.cjs', () => {
    before(() => new Function(fs.readFileSync('dist/hitext.umd.cjs'))());

    it('basic', () => {
        textHitext(hitext);
    });
});

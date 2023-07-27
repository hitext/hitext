import fs from 'fs';
import assert from 'assert';

describe('dist/hitext.js', () => {
    before(() => new Function(fs.readFileSync('dist/hitext.js'))());

    it('basic', () => {
        const expected = 'Hello <foo>world</foo>!';
        const actual = hitext([{
            ranges: [[6, 11, 'foo']],
            printer: {
                html: {
                    open: ({ data: marker }) => '<' + marker + '>',
                    close: ({ data: marker }) => '</' + marker + '>'
                }
            }
        }]).print('Hello world!', 'html');

        assert.strictEqual(actual, expected);
    });
});
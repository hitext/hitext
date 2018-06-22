const assert = require('assert');
const hitext = require('../src');

describe('print', () => {
    it('basic', () => {
        assert.equal(
            hitext.print(
                'abc',
                [
                    { type: 0, start: 0, end: 1, data: 'a' },
                    { type: 0, start: 1, end: 2, data: 'b' },
                    { type: 0, start: 2, end: 3, data: 'c' }
                ],
                [
                    { print: { html: { open: x => `<${x}>`, close: x => `</${x}>` } } }
                ],
                'html'
            ),
            '<a>a</a><b>b</b><c>c</c>'
        );
    });
});

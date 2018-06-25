const assert = require('assert');
const hitext = require('../src');

describe('print', () => {
    it('basic', () => {
        assert.equal(
            hitext.print(
                'abc',
                [
                    { type: 'test', start: 0, end: 1, data: 'a' },
                    { type: 'test', start: 1, end: 2, data: 'b' },
                    { type: 'test', start: 2, end: 3, data: 'c' }
                ],
                {
                    hooks: {
                        'test': {
                            open: x => `<${x}>`,
                            close: x => `</${x}>`
                        }
                    }
                }
            ),
            '<a>a</a><b>b</b><c>c</c>'
        );
    });
});

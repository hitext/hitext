const assert = require('assert');
const hitext = require('../src');

describe('finalize', () => {
    it('internals', () => {
        assert.equal(
            hitext.finalize(
                'test',
                [
                    { print: { xxx: { smth: 'foo' } } }
                ],
                {
                    target: 'xxx',
                    finalize(source, decorators) {
                        return decorators.map(entry => entry.smth || '') + source;
                    }
                }
            ),
            `footest`
        );
    });
});

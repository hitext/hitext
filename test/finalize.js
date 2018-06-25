const assert = require('assert');
const hitext = require('../src');

describe('finalize', () => {
    it('internals', () => {
        assert.equal(
            hitext.finalize(
                'test',
                {
                    target: 'xxx',
                    finalize(source) {
                        return '[' + source + ']';
                    }
                }
            ),
            `[test]`
        );
    });
});

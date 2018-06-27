const assert = require('assert');
const hitext = require('../src');

describe('finalize', () => {
    it('internals', () => {
        assert.equal(
            hitext.finalize(
                'test',
                {
                    finalize(source) {
                        return '[' + source + ']';
                    }
                }
            ),
            '[test]'
        );
    });
});

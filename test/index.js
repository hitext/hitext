const assert = require('assert');
const hitext = require('../src');

describe('basic', () => {
    it('noop', () => {
        assert.equal(hitext.decorate('Hi!'), 'Hi!');
    });
});

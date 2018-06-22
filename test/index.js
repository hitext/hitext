const assert = require('assert');
const hitext = require('../src');

describe('initial suite', () => {
    it('test', () => {
        assert.equal(hitext('Hi!'), '<h1>Hi!</h1>');
    });
});

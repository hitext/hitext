const assert = require('assert');
const hitext = require('../src');

describe('build-in generators', () => {
    describe('spotlight', () => {
        it('basic', () =>
            assert.equal(
                hitext.decorate(
                    '12345678901234567890',
                    [hitext.generator.spotlight([3, 6], [10, 15])],
                    'html'
                ),
                '<div>123<span class="spotlight">456</span>7890<span class="spotlight">12345</span>67890</div>'
            )
        );
    });
});

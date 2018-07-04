const assert = require('assert');
const hitext = require('../src');

describe('build-in generators', () => {
    describe('spotlight', () => {
        it('basic', () =>
            assert.equal(
                hitext.decorate(
                    '1234567890',
                    [hitext.generator.spotlight([3, 6])],
                    'html'
                ),
                '<div>123<span class="spotlight">456</span>7890</div>'
            )
        );

        it('several ranges', () =>
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

    describe('match', () => {
        it('using string', () =>
            assert.equal(
                hitext.decorate(
                    'Hello world! Hello world!',
                    [hitext.generator.match('world')],
                    'html'
                ),
                '<div>Hello <span class="match">world</span>! Hello <span class="match">world</span>!</div>'
            )
        );

        it('using regexp', () =>
            assert.equal(
                hitext.decorate(
                    'Hello world!',
                    [hitext.generator.match(/\w+/)],
                    'html'
                ),
                '<div><span class="match">Hello</span> <span class="match">world</span>!</div>'
            )
        );

        it('using custom type', () =>
            assert.equal(
                hitext.decorate(
                    'Hello world!',
                    [hitext.generator.match(/\w+/, 'spotlight')],
                    'html'
                ),
                '<div><span class="spotlight">Hello</span> <span class="spotlight">world</span>!</div>'
            )
        );
    });
});

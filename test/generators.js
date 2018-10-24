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
                '123<span class="spotlight">456</span>7890'
            )
        );

        it('several ranges', () =>
            assert.equal(
                hitext.decorate(
                    '12345678901234567890',
                    [hitext.generator.spotlight([3, 6], [10, 15])],
                    'html'
                ),
                '123<span class="spotlight">456</span>7890<span class="spotlight">12345</span>67890'
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
                'Hello <span class="match">world</span>! Hello <span class="match">world</span>!'
            )
        );

        it('using non-string and non-regexp value', () =>
            assert.equal(
                hitext.decorate(
                    '1234567890',
                    [hitext.generator.match(123)],
                    'html'
                ),
                '<span class="match">123</span>4567890'
            )
        );

        it('using regexp', () =>
            assert.equal(
                hitext.decorate(
                    'Hello world!',
                    [hitext.generator.match(/\w+/)],
                    'html'
                ),
                '<span class="match">Hello</span> <span class="match">world</span>!'
            )
        );

        it('using regexp with flags', () =>
            assert.equal(
                hitext.decorate(
                    'Hello world!',
                    [hitext.generator.match(/hello|world/ig)],
                    'html'
                ),
                '<span class="match">Hello</span> <span class="match">world</span>!'
            )
        );

        it('using custom type', () =>
            assert.equal(
                hitext.decorate(
                    'Hello world!',
                    [hitext.generator.match(/\w+/, 'spotlight')],
                    'html'
                ),
                '<span class="spotlight">Hello</span> <span class="spotlight">world</span>!'
            )
        );
    });
});

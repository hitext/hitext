const assert = require('assert');
const hitext = require('../src');

describe('build-in printers', () => {
    describe('html', () => {
        it('basic', () =>
            assert.equal(
                hitext.print(
                    '123',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 }
                    ],
                    'html'
                ),
                '<div><span class="syntax--value">1</span><span class="spotlight">2</span><span class="match">3</span></div>'
            )
        );

        it('should escape special chars', () => {
            assert.equal(
                hitext.print('<br>&amp;', [], 'html'),
                '<div>&lt;br&gt;&amp;amp;</div>'
            );
        });
    });

    describe('tty', () => {
        it('basic', () =>
            assert.equal(
                hitext.print(
                    '123',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 }
                    ],
                    'tty'
                ),
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3'
            )
        );
    });
});

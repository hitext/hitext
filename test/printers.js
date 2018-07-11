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

    describe('fork printer', () => {
        it('all default printers have a fork method', () => {
            for (var name in hitext.printer) {
                assert.equal(typeof hitext.printer[name].fork, 'function');
            }
        });

        it('html', () => {
            const ranges = [
                { type: 'syntax', start: 0, end: 1, data: 'value' },
                { type: 'spotlight', start: 1, end: 2 },
                { type: 'match', start: 2, end: 3 }
            ];
            const htmlPrinter = hitext.printer.html;
            const customHtmlPrinter = htmlPrinter.fork({
                hooks: {
                    match: {
                        open() {
                            return '<custom>';
                        },
                        close() {
                            return '</custom>';
                        }
                    }
                }
            });

            assert.equal(
                hitext.print('123', ranges, htmlPrinter),
                '<div><span class="syntax--value">1</span><span class="spotlight">2</span><span class="match">3</span></div>'
            );
            assert.equal(
                hitext.print('123', ranges, customHtmlPrinter),
                '<div><span class="syntax--value">1</span><span class="spotlight">2</span><custom>3</custom></div>'
            );
            assert.equal(typeof customHtmlPrinter.fork, 'function');
        });
    });
});

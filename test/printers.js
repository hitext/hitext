const assert = require('assert');
const hitext = require('../src');
const print = require('../src/print');

describe('build-in printers', () => {
    describe('html', () => {
        it('basic', () =>
            assert.equal(
                print(
                    '123',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 }
                    ],
                    hitext.printer.html
                ),
                '<span class="syntax--value">1</span><span class="spotlight">2</span><span class="match">3</span>'
            )
        );

        it('should escape special chars', () => {
            assert.equal(
                print('<br>&amp;', [], hitext.printer.html),
                '&lt;br&gt;&amp;amp;'
            );
        });
    });

    describe('tty', () => {
        it('basic', () =>
            assert.equal(
                print(
                    '123',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 }
                    ],
                    hitext.printer.tty
                ),
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3'
            )
        );
    });

    describe('fork printer', () => {
        it('all default printers have a fork method', () => {
            for (var name in hitext.printer) {
                const printer = hitext.printer[name];

                if (typeof printer !== 'function') {
                    assert.equal(typeof printer.fork, 'function');
                }
            }
        });

        it('should support a fork with no changes', () => {
            assert.doesNotThrow(() => {
                hitext.printer.html.fork();
                hitext.printer.html.fork({});
            });
        });

        it('extend html printer', () => {
            const ranges = [
                { type: 'syntax', start: 0, end: 1, data: 'value' },
                { type: 'spotlight', start: 1, end: 2 },
                { type: 'match', start: 2, end: 3 }
            ];
            const htmlPrinter = hitext.printer.html;
            const customHtmlPrinter = htmlPrinter.fork({
                ranges: {
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
                print('123', ranges, htmlPrinter),
                '<span class="syntax--value">1</span><span class="spotlight">2</span><span class="match">3</span>'
            );
            assert.equal(
                print('123', ranges, customHtmlPrinter),
                '<span class="syntax--value">1</span><span class="spotlight">2</span><custom>3</custom>'
            );
            assert.equal(typeof customHtmlPrinter.fork, 'function');
        });
    });
});

const assert = require('assert');
const hitext = require('../src');
const print = require('../src/print');

describe('build-in printers', () => {
    describe('html', () => {
        it('basic', () =>
            assert.equal(
                print(
                    'abc',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 }
                    ],
                    hitext.printer.html
                ),
                'abc'
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
                    '1234',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 },
                        { type: 'color', start: 3, end: 4, data: 'foo' }
                    ],
                    hitext.printer.tty.fork({
                        ranges: {
                            spotlight({ createStyle }) {
                                return createStyle('bgBlue', 'white');
                            },
                            syntax({ createStyleMap }) {
                                return createStyleMap(
                                    { 'value': 'cyan' }
                                );
                            },
                            color({ createStyleMap }) {
                                return createStyleMap([
                                    'green',
                                    'red',
                                    'yellow',
                                    'blue'
                                ], ({ data }) => data.length - 1);
                            }
                        }
                    })
                ),
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3\u001b[33m4\u001b[39m'
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
                '123'
            );
            assert.equal(
                print('123', ranges, customHtmlPrinter),
                '12<custom>3</custom>'
            );
            assert.equal(typeof customHtmlPrinter.fork, 'function');
        });
    });
});

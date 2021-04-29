import { equal, doesNotThrow } from 'assert';
import mode from './helpers/mode.js';
import { printer as _printer } from './helpers/lib';
import print from '../lib/print';

describe('build-in printers', () => {
    describe('html', () => {
        it('basic', () =>
            equal(
                print(
                    'abc',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 }
                    ],
                    _printer.html
                ),
                'abc'
            )
        );

        it('should escape special chars', () => {
            equal(
                print('<br>&amp;', [], _printer.html),
                '&lt;br&gt;&amp;amp;'
            );
        });

        it('should be extendable', () => {
            const ranges = [
                { type: 'syntax', start: 0, end: 1, data: 'value' },
                { type: 'spotlight', start: 1, end: 2 },
                { type: 'match', start: 2, end: 3 }
            ];
            const htmlPrinter = _printer.html;
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

            equal(
                print('123', ranges, htmlPrinter),
                '123'
            );
            equal(
                print('123', ranges, customHtmlPrinter),
                '12<custom>3</custom>'
            );
            equal(typeof customHtmlPrinter.fork, 'function');
        });
    });

    (mode === 'src' ? describe : describe.skip)('tty', () => {
        it('basic', () =>
            equal(
                print(
                    '1234',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2 },
                        { type: 'match', start: 2, end: 3 },
                        { type: 'color', start: 3, end: 4, data: 'foo' }
                    ],
                    _printer.tty.fork({
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
            for (var name in _printer) {
                const printer = _printer[name];

                if (typeof printer !== 'function') {
                    equal(typeof printer.fork, 'function');
                }
            }
        });

        it('should support a fork with no changes', () => {
            doesNotThrow(() => {
                _printer.html.fork();
                _printer.html.fork({});
            });
        });
    });
});

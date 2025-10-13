import { equal, doesNotThrow } from 'assert';
import { print, html as printerHtml, tty as printerTty } from '../src/index.js';

describe('build-in printers', () => {
    describe('html', () => {
        it('basic', () =>
            equal(
                print(
                    'abc',
                    [
                        { type: 'syntax', start: 0, end: 1, data: 'value' },
                        { type: 'spotlight', start: 1, end: 2, data: undefined },
                        { type: 'match', start: 2, end: 3, data: undefined }
                    ],
                    printerHtml
                ),
                'abc'
            )
        );

        it('should escape special chars', () => {
            equal(
                print('<br>&amp;', [], printerHtml),
                '&lt;br&gt;&amp;amp;'
            );
        });

        it.skip('should be extendable', () => {
            // const ranges: Range[] = [
            //     { type: 'syntax', start: 0, end: 1, data: 'value' },
            //     { type: 'spotlight', start: 1, end: 2 },
            //     { type: 'match', start: 2, end: 3 }
            // ];
            // TODO: Implement fork functionality for new API
            // const htmlPrinter = html;
            // const customHtmlPrinter = htmlPrinter.fork({
            //     hooks: {
            //         match: {
            //             before() {
            //                 return '<custom>';
            //             },
            //             after() {
            //                 return '</custom>';
            //             }
            //         }
            //     }
            // });

            // equal(
            //     print('123', ranges, htmlPrinter),
            //     '123'
            // );
            // equal(
            //     print('123', ranges, customHtmlPrinter),
            //     '12<custom>3</custom>'
            // );
            // equal(typeof customHtmlPrinter.fork, 'function');
        });
    });

    describe.skip('tty', () => {
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
                    // {} as any
                    // hitext.printer.tty.fork({
                    //     hooks: {
                    //         spotlight({ createStyle }) {
                    //             return createStyle('bgBlue', 'white');
                    //         },
                    //         syntax({ createStyleMap }) {
                    //             return createStyleMap(
                    //                 { 'value': 'cyan' }
                    //             );
                    //         },
                    //         color({ createStyleMap }) {
                    //             return createStyleMap([
                    //                 'green',
                    //                 'red',
                    //                 'yellow',
                    //                 'blue'
                    //             ], ({ data }) => data.length - 1);
                    //         }
                    //     }
                    // })
                ),
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3\u001b[33m4\u001b[39m'
            )
        );
    });

    describe.skip('fork printer', () => {
        it('all default printers have a fork method', () => {
            for (const name in hitext.printer) {
                const printer = (hitext.printer as any)[name];

                if (typeof printer !== 'function') {
                    equal(typeof printer.fork, 'function');
                }
            }
        });

        it('should support a fork with no changes', () => {
            doesNotThrow(() => {
                // hitext.printerHtml.fork();
                // hitext.printerHtml.fork({});
            });
        });
    });
});

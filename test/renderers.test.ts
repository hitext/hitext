import { equal } from 'assert';
import { html as htmlRenderer, tty as ttyRenderer } from '../src/index.js';

describe('built-in renderers', () => {
    describe('html', () => {
        it('basic', () =>
            equal(
                htmlRenderer()
                    .addLayer([
                        { start: 0, end: 1, data: 'value' },
                        { start: 1, end: 2 },
                        { start: 2, end: 3 }
                    ], () => ({}))
                    .render('abc'),
                'abc'
            )
        );

        it('should escape special chars', () => {
            equal(
                htmlRenderer().render('<br>&amp;'),
                '&lt;br&gt;&amp;amp;'
            );
        });

        it('should be extendable via pipeline', () => {
            const base = htmlRenderer()
                .addLayer([
                    { start: 0, end: 1 },
                    { start: 1, end: 2 }
                ], {
                    open: () => '<span>',
                    close: () => '</span>'
                });

            // Can add more layers to extend functionality
            const extended = base.addLayer([
                { start: 2, end: 3 }
            ], {
                open: () => '<custom>',
                close: () => '</custom>'
            });

            equal(
                base.render('123'),
                '<span>1</span><span>2</span>3'
            );
            equal(
                extended.render('123'),
                '<span>1</span><span>2</span><custom>3</custom>'
            );
        });
    });

    describe('tty', () => {
        it('basic with createStyle', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1 }
                ], ({ createStyle }) => createStyle('cyan'))
                .addLayer([
                    { start: 1, end: 2 }
                ], ({ createStyle }) => createStyle('bgBlue', 'white'))
                .addLayer([
                    { start: 3, end: 4 }
                ], ({ createStyle }) => createStyle('yellow'))
                .render('1234');

            equal(
                result,
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3\u001b[33m4\u001b[39m'
            );
        });

        it('with createStyleMap', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1, data: 'value' },
                    { start: 3, end: 4, data: 'other' }
                ], ({ createStyleMap }) => createStyleMap({
                    'value': 'cyan',
                    'other': 'yellow'
                }))
                .render('1234');

            equal(
                result,
                '\u001b[36m1\u001b[39m23\u001b[33m4\u001b[39m'
            );
        });

        it('createStyleMap with custom data fetcher', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1, data: { priority: 'high' } },
                    { start: 1, end: 2, data: { priority: 'low' } }
                ], ({ createStyleMap }) => createStyleMap(
                    {
                        'high': 'red',
                        'low': 'green'
                    },
                    ({ data }) => data.priority
                ))
                .render('12');

            equal(
                result,
                '\u001b[31m1\u001b[32m2\u001b[39m'
            );
        });
    });
});

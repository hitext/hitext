import { equal } from 'assert';
import { html as htmlRenderer } from '../src/index.js';

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
});

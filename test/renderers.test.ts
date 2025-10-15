import { strictEqual } from 'assert';
import { html } from '../src/index.js';

describe('built-in renderers', () => {
    describe('html', () => {
        it('should render plain text', () =>
            strictEqual(
                html()
                    .addLayer([[0, 1], [1, 2], [2, 3]], {})
                    .render('abc'),
                'abc'
            )
        );

        it('should escape special chars', () => {
            strictEqual(
                html().render('<br>&amp;'),
                '&lt;br&gt;&amp;amp;'
            );
        });

        it('should be extendable via pipeline', () => {
            const base = html()
                .addLayer([[0, 1], [1, 2]], (content) => `<span>${content}</span>`);

            // Can add more layers to extend functionality
            const extended = base.addLayer([[2, 3]], (content) => `<custom>${content}</custom>`);

            strictEqual(
                base.render('123'),
                '<span>1</span><span>2</span>3'
            );
            strictEqual(
                extended.render('123'),
                '<span>1</span><span>2</span><custom>3</custom>'
            );
        });
    });
});

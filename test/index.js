const assert = require('assert');
const hitext = require('../src');

const source = '12345678';
const expected = '<a>1234</a><b>5678</b>';
const genA = (source, createRange) => createRange(0, 4, 'a');
const genB = (source, createRange) => createRange(4, 8, 'b');
const printer = {
    html: {
        open: marker => '<' + marker + '>',
        close: marker => '</' + marker + '>'
    }
};
const pluginA = {
    ranges: genA,
    printer
};
const pluginB = {
    ranges: genB,
    printer
};

describe('basic', () => {
    it('should print', () => {
        assert.equal(hitext().decorate('Hi!'), 'Hi!');
    });

    it('hitext(plugins, printerType)', () => {
        assert.equal(
            hitext([pluginA, pluginB], 'html').decorate(source),
            expected
        );
    });

    it('hitext(generators).printer()', () => {
        assert.equal(
            hitext([pluginA, pluginB])
                .printer('html')
                .decorate(source),
            expected
        );
    });

    it('hitext(generators) as arrays', () => {
        assert.equal(
            hitext([[genA, printer], [{ ranges: genB, printer }]])
                .decorate(source, 'html'),
            expected
        );
    });

    it('hitext.use()', () => {
        assert.equal(
            hitext
                .use(pluginA)
                .use(pluginB)
                .decorate(source, 'html'),
            expected
        );
    });

    it('hitext().use().printer()', () => {
        assert.equal(
            hitext
                .use(pluginA)
                .use(pluginB)
                .printer('html')
                .decorate(source),
            expected
        );
    });

    describe('hitext.use()', () => {
        it('should return a decorate function', () => {
            const decorate = hitext
                .use({ ranges: genA, printer })
                .use(pluginB);

            assert.equal(
                decorate(source, 'html'),
                expected
            );
        });

        it('with set { generator, printer }', () => {
            const pipeline = hitext
                .use({ ranges: genA, printer })
                .use(pluginB);

            assert.equal(
                pipeline.decorate(source, 'html'),
                expected
            );
        });

        it('should take two arguments', () => {
            const decorate = hitext
                .use(genA, printer)
                .use(pluginB);

            assert.equal(
                decorate(source, 'html'),
                expected
            );
        });

        it('should take an array as first argument', () => {
            const decorate = hitext
                .use([[0, 4, 'a'], [4, 8, 'b']], printer);

            assert.equal(
                decorate(source, 'html'),
                expected
            );
        });

        it('second argument should override plugin\'s default printer', () => {
            const decorate = hitext
                .use(pluginA, {
                    html: {
                        open: () => '!!',
                        close: () => '!/!'
                    }
                });

            assert.equal(
                decorate(source, 'html'),
                '!!1234!/!5678'
            );
        });

        it('compose printers', () => {
            const pipeline = hitext
                .use({
                    ranges: [[1, 2]],
                    printer: {
                        html: {
                            open: () => '<foo>',
                            close: () => '</foo>'
                        }
                    }
                })
                .use({
                    ranges: [[1, 2]],
                    printer: {
                        html: {
                            open: () => '<bar>',
                            close: () => '</bar>'
                        }
                    }
                });

            assert.equal(
                pipeline.decorate('abc', 'html'),
                'a<foo><bar>b</bar></foo>c'
            );
        });
    });
});

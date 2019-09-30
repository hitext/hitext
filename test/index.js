const assert = require('assert');
const hitext = require('../src');

const source = '12345678';
const expected = '<a>1234</a><b>5678</b>';
const genA = (source, createRange) => createRange('stub', 0, 4, 'a');
const genB = (source, createRange) => createRange('stub', 4, 8, 'b');
const printer = {
    ranges: {
        stub: {
            open: marker => '<' + marker + '>',
            close: marker => '</' + marker + '>'
        }
    }
};

describe('basic', () => {
    it('should print', () => {
        assert.equal(hitext.decorate('Hi!'), 'Hi!');
        assert.equal(hitext().decorate('Hi!'), 'Hi!');
    });

    it('hitext(generators, printer)', () => {
        assert.equal(
            hitext([genA, genB], printer).decorate(source),
            expected
        );
    });

    it('hitext(null, printer).use()', () => {
        assert.equal(
            hitext(null, printer)
                .use(genA)
                .use(genB)
                .decorate(source),
            expected
        );
    });

    it('hitext(generators).printer()', () => {
        assert.equal(
            hitext([genA, genB])
                .printer(printer)
                .decorate(source),
            expected
        );
    });

    it('hitext().use().printer()', () => {
        assert.equal(
            hitext()
                .use(genA)
                .use(genB)
                .printer(printer)
                .decorate(source),
            expected
        );
    });

    it('hitext().use() with set { generator, printer }', () => {
        assert.equal(
            hitext()
                .use({ generator: genA, printer: { html: printer } })
                .use(genB)
                .decorate(source, 'html'),
            expected
        );
    });

    it('hitext().use() should return a decorate function', () => {
        const decorate = hitext()
            .use({ generator: genA, printer: { html: printer } })
            .use(genB);

        assert.equal(
            decorate(source, 'html'),
            expected
        );
    });

    it('hitext().use() compose printers', () => {
        const decorate = hitext()
            .use({
                generator: (_, addRange) => addRange('foo', 1, 2),
                printer: {
                    html: {
                        ranges: {
                            foo: {
                                open: () => '<foo>',
                                close: () => '</foo>'
                            }
                        }
                    }
                }
            })
            .use({
                generator: (_, addRange) => addRange('bar', 1, 2),
                printer: {
                    html: {
                        ranges: {
                            bar: {
                                open: () => '<bar>',
                                close: () => '</bar>'
                            }
                        }
                    }
                }
            })
            .decorate;

        assert.equal(
            decorate('abc', 'html'),
            'a<foo><bar>b</bar></foo>c'
        );
    });
});

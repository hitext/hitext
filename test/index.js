import { equal } from 'assert';
import hitext from 'hitext';

const use = hitext.use;
const source = '12345678';
const expected = '<a>1234</a><b>5678</b>';
const genA = (source, createRange) => createRange(0, 4, 'a');
const genB = (source, createRange) => createRange(4, 8, 'b');
const printer = {
    html: {
        open: ({ data: marker }) => '<' + marker + '>',
        close: ({ data: marker }) => '</' + marker + '>'
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
        equal(hitext().print('Hi!'), 'Hi!');
    });

    it('hitext(plugins, printerType)', () => {
        equal(
            hitext([pluginA, pluginB], 'html').print(source),
            expected
        );
    });

    it('hitext(generators).printer()', () => {
        equal(
            hitext([pluginA, pluginB])
                .printer('html')
                .print(source),
            expected
        );
    });

    it('hitext(generators) as arrays', () => {
        equal(
            hitext([[genA, printer], [{ ranges: genB, printer }]])
                .print(source, 'html'),
            expected
        );
    });

    it('hitext.use()', () => {
        equal(
            use(pluginA)
                .use(pluginB)
                .print(source, 'html'),
            expected
        );
    });

    it('hitext().use().printer()', () => {
        equal(
            use(pluginA)
                .use(pluginB)
                .printer('html')
                .print(source),
            expected
        );
    });

    describe('hitext.use()', () => {
        it('should return a decorate function', () => {
            const print = use({ ranges: genA, printer })
                .use(pluginB);

            equal(
                print(source, 'html'),
                expected
            );
        });

        it('with set { generator, printer }', () => {
            const pipeline = use({ ranges: genA, printer })
                .use(pluginB);

            equal(
                pipeline.print(source, 'html'),
                expected
            );
        });

        it('should take two arguments', () => {
            const print = use(genA, printer)
                .use(pluginB);

            equal(
                print(source, 'html'),
                expected
            );
        });

        it('should take an array as first argument', () => {
            const print = use([[0, 4, 'a'], [4, 8, 'b']], printer);

            equal(
                print(source, 'html'),
                expected
            );
        });

        it('second argument should override plugin\'s default printer', () => {
            const print = use(pluginA, {
                html: {
                    open: () => '!!',
                    close: () => '!/!'
                }
            });

            equal(
                print(source, 'html'),
                '!!1234!/!5678'
            );
        });

        it.skip('functional printer\'s extension should be lazy', () => {
            let called = 0;
            const print = use(genA, {
                html: () => called++
            });

            equal(called, 0);

            print('asd', 'html');
            equal(called, 1);

            print('asd', 'html');
            equal(called, 1);
        });

        it('compose printers', () => {
            const pipeline = use({
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

            equal(
                pipeline.print('abc', 'html'),
                'a<foo><bar>b</bar></foo>c'
            );
        });
    });
});

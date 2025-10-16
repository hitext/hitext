import assert from 'assert';

export function textHitext(hitext) {
    const expected = 'Hello <foo>world</foo>!';
    const actual = hitext.html()
        .addLayer(
            [[6, 11, 'foo']],
            (content, { data: marker }) => `<${marker}>${content}</${marker}>`
        )
        .render('Hello world!');

    assert.strictEqual(actual, expected);
}

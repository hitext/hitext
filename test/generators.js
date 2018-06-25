const assert = require('assert');
const hitext = require('../src');

describe('decorators', () => {
    const wrapper = hitext.finalize('[:::]', hitext.printer.html).split('[:::]');

    describe('spotlight', () => {
        it('basic', () =>
            assert.equal(
                hitext.decorate(
                    '12345678901234567890',
                    [hitext.generator.spotlight([3, 6], [10, 15])],
                    'html'
                ),
                `${wrapper[0]}123<span class="spotlight">456</span>7890<span class="spotlight">12345</span>67890${wrapper[1]}`
            )
        );
    });

    describe('lang-js', () => {
        it('basic', () => {
            assert.equal(
                hitext.decorate(
                    'function hi(a, b) {\n  return a + b;\n}',
                    [hitext.generator.lang.js(hitext.generator.lang.js.syntax)],
                    hitext.printer.html
                ),
                `${wrapper[0]}<span class="syntax--keyword">function</span> <span class="syntax--name">hi</span><span class="syntax--punctuator">(</span><span class="syntax--name">a</span><span class="syntax--punctuator">,</span> <span class="syntax--name">b</span><span class="syntax--punctuator">)</span> <span class="syntax--punctuator">{</span>
  <span class="syntax--keyword">return</span> <span class="syntax--name">a</span> <span class="syntax--operator">+</span> <span class="syntax--name">b</span><span class="syntax--punctuator">;</span>
<span class="syntax--punctuator">}</span>${wrapper[1]}`
            );
        });

        it('bad syntax', () => {
            const code = '1$%#!';
            assert.equal(
                hitext.decorate(
                    code,
                    [hitext.generator.lang.js(hitext.generator.lang.js.syntax)],
                    hitext.printer.html
                ),
                wrapper[0] + code + wrapper[1]
            );
        });

        it('with spotlight', () => {
            assert.equal(
                hitext.decorate(
                    'function hi(a, b) {\n  return a + b;\n}',
                    [
                        hitext.generator.lang.js(hitext.generator.lang.js.syntax),
                        hitext.generator.spotlight([22, 34])
                    ],
                    hitext.printer.html
                ),
                `${wrapper[0]}<span class="syntax--keyword">function</span> <span class="syntax--name">hi</span><span class="syntax--punctuator">(</span><span class="syntax--name">a</span><span class="syntax--punctuator">,</span> <span class="syntax--name">b</span><span class="syntax--punctuator">)</span> <span class="syntax--punctuator">{</span>
  <span class="spotlight"><span class="syntax--keyword">return</span> <span class="syntax--name">a</span> <span class="syntax--operator">+</span> <span class="syntax--name">b</span></span><span class="syntax--punctuator">;</span>
<span class="syntax--punctuator">}</span>${wrapper[1]}`

            );
        });
    });
});

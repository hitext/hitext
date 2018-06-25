const assert = require('assert');
const hitext = require('../src');

describe('decorators', () => {
    describe('syntax-js', () => {
        const wrapper = hitext.finalize('[:::]', hitext.printer.html).split('[:::]');

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
    });
});

const assert = require('assert');
const hitext = require('../src');

describe('decorators', () => {
    describe('syntax-js', () => {
        const wrapper = hitext.finalize('[:::]', [hitext.decorator['syntax-js']], hitext.printer.html).split('[:::]');

        it('basic', () => {
            assert.equal(
                hitext.decorate(
                    'function hi(a, b) {\n  return a + b;\n}',
                    [hitext.decorator['syntax-js']],
                    hitext.printer.html
                ),
                `${wrapper[0]}<span class="token keyword">function</span> <span class="token name">hi</span><span class="token punctuator">(</span><span class="token name">a</span><span class="token punctuator">,</span> <span class="token name">b</span><span class="token punctuator">)</span> <span class="token punctuator">{</span>
  <span class="token keyword">return</span> <span class="token name">a</span> <span class="token operator">+</span> <span class="token name">b</span><span class="token punctuator">;</span>
<span class="token punctuator">}</span>${wrapper[1]}`
            );
        });

        it('bad syntax', () => {
            const code = '1$%#!';
            assert.equal(
                hitext.decorate(
                    code,
                    [hitext.decorator['syntax-js']],
                    hitext.printer.html
                ),
                wrapper[0] + code + wrapper[1]
            );
        });
    });
});

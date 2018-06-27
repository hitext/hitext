<img align="right" width="125" height="125"
     alt="HiText logo"
     src="https://user-images.githubusercontent.com/270491/41946489-795b7e6a-79bb-11e8-9b1f-012b0dee3f0a.png"/>

# HiText

[![NPM version](https://img.shields.io/npm/v/hitext.svg)](https://www.npmjs.com/package/hitext)
[![Build Status](https://travis-ci.org/hitext/hitext.svg?branch=master)](https://travis-ci.org/hitext/hitext)
[![Coverage Status](https://coveralls.io/repos/github/hitext/hitext/badge.svg?branch=master)](https://coveralls.io/github/hitext/hitext?branch=master)

HiText is a basis for a text (source code) decoration. The main goal is to provide a universal way to combine libraries decorating text and an output in the required format (HTML, TTY etc). The only prerequsites you need are a source text and set of ranges with some options, the rest will be done by HiText.

## Why?

Just imagine you want to output in HTML a JavaScript code with syntax highlighting and to spotlight some fragments of it. You can use a library for syntax highlighting, that's not a problem. For fragment spotlighting you can get substrings and wrap them into HTML tags. Both operations are not so hard, but the problem is to combine of their results. Each operation adds HTML tags to a source, so other operations will not perform as expected because of HTML tags.

The solution is to change decoration operations to produce ranges instead of markup. Once ranges is generated HiText merges them by universal rules and gets a stream of segments. As the final step, this stream is used to generate open and close tags when needed.

The approach allows to combine any number of decorators (which became range generators). Moreover, using a source and a range set, it's possible to output a result in any format beside HTML. A output format is defined by a printer.

## Features

- Univeral way to combine any number of decorators (generators)
- Much easier to make a generator
- Parser with formatting loses can be used. No need to mutate AST to decorate a code
- Flexible setup for output format. Build-in printers: HTML, TTY (terminal)

## Example

```js
const hitext = require('hitext');

hitext.decorate(
    'const a = 1;\nconst b = 2;',
    [
        // NOTE: hitext.generator.lang.js will be extracted to separate package
        hitext.generator.lang.js(hitext.generator.lang.js.syntax),
        hitext.generator.spotlight([6, 11], [19, 24])
    ],
    hitext.printer.html
);
```

Result:

```html
<style>
.syntax--keyword,.syntax--attr-value{color:#07a}
.syntax--string{color:#690;word-break:break-all}
.syntax--punctuator{color:#999}
.syntax--number,.syntax--value-keyword,.syntax--tag{color:#905}
.syntax--attr-name{color:#690}
.syntax--regexp{color:#e90}
.syntax--comment{color:slategray}
.spotlight{background:#fdf8cc}
</style>
<div><span class="syntax--keyword">const</span> <span class="spotlight"><span class="syntax--name">a</span> <span class="syntax--operator">=</span> <span class="syntax--number">1</span></span><span class="syntax--punctuator">;</span>
<span class="syntax--keyword">const</span> <span class="spotlight"><span class="syntax--name">b</span> <span class="syntax--operator">=</span> <span class="syntax--number">2</span></span><span class="syntax--punctuator">;</span></div>
```

![image](https://user-images.githubusercontent.com/270491/41946250-0df745e2-79ba-11e8-8b32-38a9f938a380.png)

## License

MIT

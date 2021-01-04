const fs = require('fs');
const esbuild = require('esbuild');
const log = async (outfile, fn) => {
    const start = Date.now();
    try {
        await fn(outfile);
    } finally {
        console.log(outfile, fs.statSync(outfile).size, 'bytes in', Date.now() - start, 'ms');
    }
};

const banner = `(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.hitext = factory());
}(this, (function () { 'use strict';`;
const footer = `
  return exports;
})));`;

async function build() {
    await log('dist/hitext.js', (outfile) => esbuild.build({
        entryPoints: ['src/index.js'],
        outfile,
        target: ['es2018'],
        format: 'iife',
        globalName: 'exports',
        banner,
        footer,
        bundle: true,
        // metafile: 'dist/hitext.meta.json',
        plugins: [{
            name: 'replace',
            setup({ onLoad }) {
                onLoad({ filter: /package\.json/ }, args => ({
                    contents: 'module.exports = ' + JSON.stringify({
                        version: require(args.path).version
                    })
                }));
            }
        }]
    }));

    await log('dist/hitext.min.js', (outfile) => esbuild.build({
        entryPoints: ['dist/hitext.js'],
        outfile,
        format: 'cjs',
        minify: true
    }));
}

build();

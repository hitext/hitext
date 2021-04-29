import fs from 'fs';
import esbuild from 'esbuild';

const log = async (outfile, fn) => {
    const start = Date.now();
    try {
        await fn(outfile);
    } finally {
        const stat = fs.statSync(outfile);
        if (stat.isDirectory()) {
            console.log(outfile, 'in', Date.now() - start, 'ms');
        } else {
            console.log(outfile, stat.size, 'bytes in', Date.now() - start, 'ms');
        }
    }
};

const banner = { js: `(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.hitext = factory());
}(this, (function () { 'use strict';` };
const footer = { js: `
  return exports;
})));` };
const plugins = [{
    name: 'replace',
    setup({ onLoad }) {
        onLoad({ filter: /package\.json/ }, args => ({
            contents: 'module.exports = ' + JSON.stringify({
                version: require(args.path).version
            })
        }));
    }
}];

async function build() {
    // bundle
    await log('dist/hitext.js', (outfile) => esbuild.build({
        entryPoints: ['src/index.ts'],
        target: ['es2018'],
        format: 'iife',
        globalName: 'exports',
        outfile,
        banner,
        footer,
        bundle: true,
        // metafile: 'dist/hitext.meta.json',
        plugins
    }));

    // minified bundle
    await log('dist/hitext.min.js', (outfile) => esbuild.build({
        entryPoints: ['dist/hitext.js'],
        outfile,
        format: 'cjs',
        minify: true
    }));

    // commonjs modules
    const meta = JSON.parse(fs.readFileSync('./dist/hitext.meta.json'));
    await log('lib', () => esbuild.build({
        entryPoints: Object.keys(meta.inputs),
        format: 'cjs',
        target: ['es2018'],
        outdir: 'lib'
    }));

    await log('lib', () => esbuild.build({
        entryPoints: Object.keys(meta.inputs),
        format: 'esm',
        target: ['es2018'],
        outdir: 'lib',
        outExtension: {
            '.js': '.mjs'
        }
    }));
}

build();

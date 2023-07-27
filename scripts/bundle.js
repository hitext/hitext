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
  (global.hitext = factory());
}(typeof globalThis != 'undefined' ? globalThis : typeof window != 'undefined' ? window : typeof global != 'undefined' ? global : typeof self != 'undefined' ? self : this, (function () {` };
const footer = { js: `
  return exports.default;
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
        target: ['es2020'],
        format: 'iife',
        globalName: 'exports',
        outfile,
        // write: false,
        banner,
        footer,
        bundle: true,
        plugins
    }));

    // minified bundle
    await log('dist/hitext.min.js', (outfile) => esbuild.build({
        entryPoints: ['dist/hitext.js'],
        outfile,
        format: 'iife',
        minify: true
    }));
}

build();

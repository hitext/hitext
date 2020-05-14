const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');

module.exports = {
    input: 'src/index.js',
    output: [
        { name: 'hitext', format: 'umd', file: 'dist/hitext.js' },
        { name: 'hitext', format: 'umd', file: 'dist/hitext.min.js' }
    ],
    plugins: [
        resolve({ browser: true }),
        commonjs(),
        terser({ include: /\.min\./ })
    ]
};

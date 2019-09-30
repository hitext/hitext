const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

module.exports = {
    input: 'src/index.js',
    output: {
        file: 'dist/hitext.js',
        name: 'hitext',
        format: 'umd'
    },
    plugins: [
        resolve({ browser: true }),
        commonjs()
    ]
};

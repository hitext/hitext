import chalk from 'chalk';
import mode from './mode.js';
import libPaths from './lib-path.js';

const { white, yellow } = chalk;
const libPath = libPaths[mode];
const startTime = Date.now();

if (!hasOwnProperty(mode)) {
    console.error(`Mode ${white.bgRed(mode)} is not supported!\n`);
    process.exit(1);
}

console.info('Test lib entry:', yellow(libPath));
console.log('Lib loaded in', Date.now() - startTime, 'ms');

console.log(require('../../' + libPath));

export * from '../../lib/index.mjs';

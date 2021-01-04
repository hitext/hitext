const chalk = require('chalk');
const mode = require('./mode');
const libPaths = require('./lib-path');
const libPath = libPaths[mode];
const startTime = Date.now();

if (!libPaths.hasOwnProperty(mode)) {
    console.error(`Mode ${chalk.white.bgRed(mode)} is not supported!\n`);
    process.exit(1);
}

console.info('Test lib entry:', chalk.yellow(libPath));
console.log('Lib loaded in', Date.now() - startTime, 'ms');

module.exports = require('../../' + libPath);

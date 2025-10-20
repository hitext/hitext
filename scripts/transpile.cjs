const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const esbuild = require('esbuild');
const chalk = require('chalk');

function createPathRewritePlugin(outputExt) {
    return {
        name: 'path-rewrite',
        setup(build) {
            // Handle original TypeScript test files
            build.onLoad({ filter: /test\/.*\.ts$/ }, async (args) => {
                let text = await fs.promises.readFile(args.path, 'utf8');
                return {
                    contents: text
                        .replace(/\.\.\/src\/index\.js/g, 'hitext')
                        .replace(/from '\.\.\/.*?\.[mc]?[jt]s'/, (m) => {
                            // test should import only public API, except to src/types.ts,
                            // which is removing on transpile
                            if (!/types(\.d)?\.[mc]?[jt]s/.test(m)) {
                                throw new Error(`Unexpected relative import ${m} in ${args.path}`);
                            }
                            return m;
                        }),
                    loader: 'ts'
                };
            });

            // Handle intermediate JavaScript files during ESM->CJS conversion
            build.onLoad({ filter: /lib-test\/.*\.js$/ }, async (args) => {
                let text = await fs.promises.readFile(args.path, 'utf8');
                return {
                    contents: text
                        .replace(/(from |require\()"(\.\/[^"]+)\.js"/g, `$1"$2${outputExt}"`),
                    loader: 'js'
                };
            });
        }
    };
}

function readDir(dir) {
    return fs
        .readdirSync(dir)
        .filter((fn) => fn.endsWith('.js') || fn.endsWith('.ts'))
        .map((fn) => `${dir}/${fn}`);
}

function getAllSourceFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getAllSourceFiles(filePath, fileList);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

async function transpile({
    entryPoints,
    outputDir,
    format,
    watch: watchMode = false,
    ts = false,
    onSuccess
}) {
    const outputExt = format === 'esm' ? '.js' : '.cjs';
    const doneMessage = (duration) =>
        `${
            ts ? 'Compile TypeScript to JavaScript (ESM)' : 'Convert ESM to CommonJS'
        } into "${outputDir}" done in ${duration}ms`;

    const buildOptions = {
        entryPoints,
        outdir: outputDir,
        outExtension: { '.js': outputExt },
        format,
        platform: 'node',
        target: 'node14',
        sourcemap: false, // ts
        plugins: [createPathRewritePlugin(outputExt)],
        logLevel: 'warning',
        packages: 'external' // Mark all imports as external (don't bundle dependencies)
    };

    if (!watchMode) {
        const startTime = Date.now();
        await esbuild.build(buildOptions);
        console.log(doneMessage(Date.now() - startTime));

        if (typeof onSuccess === 'function') {
            await onSuccess();
        }
    } else {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();

        console.log(`Watching for changes in ${entryPoints[0]}...`);

        // Call onSuccess initially and on subsequent rebuilds
        if (typeof onSuccess === 'function') {
            onSuccess();
        }

        // Note: In watch mode, we don't have direct access to build completion events
        // with the same granularity as rollup. Consider using a file watcher if needed.
    }
}

async function generateTypes(fatal = true) {
    const doneMessage = (duration) => `Generate .d.ts files into "lib" done in ${duration}ms`;

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        exec('npm run ts-emit-types', (error, stdout, stderr) => {
            if (error) {
                console.error(chalk.bgRed.white('ERROR!'), chalk.red(error.message));
                stdout && console.error(chalk.red(stdout));
                stderr && console.error(chalk.red(stderr));

                if (fatal) {
                    reject(error);
                } else {
                    resolve();
                }
            } else {
                console.log(doneMessage(Date.now() - startTime));
                resolve();
            }
        });
    });
}

async function transpileAll(options) {
    const { watch = false, types = false } = options || {};

    await transpile({
        entryPoints: getAllSourceFiles('src'),
        outputDir: './lib',
        format: 'esm',
        watch,
        ts: true,
        onSuccess: async () => {
            if (types) {
                await generateTypes(!watch);
            }
        }
    });
    await transpile({
        entryPoints: readDir('test'),
        outputDir: './lib-test',
        format: 'esm',
        watch,
        ts: true,
        onSuccess: () =>
            transpile({
                entryPoints: readDir('lib-test'),
                outputDir: './lib-test',
                format: 'cjs'
            })
    });
}

module.exports = transpileAll;

if (require.main === module) {
    transpileAll({
        watch: process.argv.includes('--watch'),
        types: process.argv.includes('--types')
    });
}

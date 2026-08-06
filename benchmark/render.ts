import { render } from '../src/index.js';
import type { GeneratedSpan, SpanHooksDefinitionMap } from '../src/index.js';

type BenchmarkInput = [
    document: string,
    spans: GeneratedSpan[],
    hooks: SpanHooksDefinitionMap<unknown, string>
];

type BenchmarkScenario = {
    name: string;
    description: string;
    input: BenchmarkInput;
};

type BenchmarkResult = {
    name: string;
    spans: number;
    documentLength: number;
    iterations: number;
    medianMs: number;
    p95Ms: number;
    operationsPerSecond: number;
    heapGrowthBytes: number | null;
};

const emptyHooks = {
    open: () => '',
    close: () => ''
};

const scenarios = createScenarios();
const options = parseOptions(process.argv.slice(2));
const selectedScenarios = scenarios.filter(scenario =>
    options.filter === null || scenario.name.includes(options.filter)
);

if (options.list) {
    for (const scenario of scenarios) {
        console.log(`${scenario.name.padEnd(28)} ${scenario.description}`);
    }
    process.exit(0);
}

if (selectedScenarios.length === 0) {
    console.error(`No benchmark scenarios match "${options.filter}".`);
    process.exit(1);
}

const results = selectedScenarios.map(runScenario);

if (options.json) {
    console.log(JSON.stringify(results, null, 2));
} else {
    printResults(results);
}

function createScenarios(): BenchmarkScenario[] {
    const disjointCount = 20_000;
    const nestedCount = 2_000;
    const crossingCount = 6_000;
    const lineCount = 5_000;
    const lineLength = 80;
    const sectionLineCount = 50;
    const pointCount = 5_000;

    const linesDocument = 'x'.repeat(lineCount * lineLength);
    const sectionSpans: GeneratedSpan[] = Array.from(
        { length: lineCount / sectionLineCount },
        (_, index) => ({
            type: 'section',
            start: index * sectionLineCount * lineLength,
            end: (index + 1) * sectionLineCount * lineLength
        })
    );
    const lineSpans: GeneratedSpan[] = Array.from(
        { length: lineCount },
        (_, index) => ({
            type: 'line',
            start: index * lineLength,
            end: (index + 1) * lineLength
        })
    );
    const sectionAndLineSpans = sectionSpans.concat(lineSpans);

    return [
        {
            name: 'single-disjoint',
            description: 'One layer with many adjacent spans',
            input: [
                'x'.repeat(disjointCount),
                Array.from({ length: disjointCount }, (_, index) => ({
                    type: 'span',
                    start: index,
                    end: index + 1
                })),
                { span: emptyHooks }
            ]
        },
        {
            name: 'single-nested',
            description: 'One layer with deeply nested spans',
            input: [
                'x'.repeat(nestedCount * 2),
                Array.from({ length: nestedCount }, (_, index) => ({
                    type: 'span',
                    start: index,
                    end: nestedCount * 2 - index
                })),
                { span: emptyHooks }
            ]
        },
        {
            name: 'single-crossing',
            description: 'One layer with crossing spans',
            input: [
                'x'.repeat(crossingCount * 2 + 16),
                Array.from({ length: crossingCount }, (_, index) => ({
                    type: 'span',
                    start: index * 2,
                    end: index * 2 + 16
                })),
                { span: emptyHooks }
            ]
        },
        {
            name: 'layers-sections-lines',
            description: 'Sections outside lines',
            input: [
                linesDocument,
                sectionAndLineSpans,
                { section: emptyHooks, line: emptyHooks }
            ]
        },
        {
            name: 'layers-lines-sections',
            description: 'Lines outside segmented sections',
            input: [
                linesDocument,
                sectionAndLineSpans,
                { line: emptyHooks, section: emptyHooks }
            ]
        },
        {
            name: 'layers-crossing',
            description: 'Two layers with repeated crossings',
            input: [
                'x'.repeat(crossingCount * 2 + 20),
                Array.from({ length: crossingCount }, (_, index) => [
                    { type: 'outer', start: index * 2, end: index * 2 + 12 },
                    { type: 'inner', start: index * 2 + 1, end: index * 2 + 15 }
                ]).flat(),
                { outer: emptyHooks, inner: emptyHooks }
            ]
        },
        {
            name: 'points-distributed',
            description: 'Layer-relative points at distinct boundaries',
            input: [
                'x'.repeat(pointCount * 2),
                [
                    { type: 'outer', start: 0, end: pointCount * 2 },
                    ...Array.from({ length: pointCount }, (_, index) => ({
                        type: 'point',
                        start: index * 2,
                        end: index * 2
                    }))
                ],
                {
                    outer: emptyHooks,
                    point: { replace: () => '' }
                }
            ]
        },
        {
            name: 'points-shared-boundary',
            description: 'Many points at one active boundary',
            input: [
                'x'.repeat(100),
                [
                    { type: 'outer', start: 0, end: 100 },
                    ...Array.from({ length: pointCount }, () => ({
                        type: 'point',
                        start: 50,
                        end: 50
                    }))
                ],
                {
                    outer: emptyHooks,
                    point: { replace: () => '' }
                }
            ]
        },
        {
            name: 'points-layer-stack',
            description: 'Points between earlier and later active layers',
            input: [
                'x'.repeat(100),
                [
                    { type: 'outer', start: 0, end: 100 },
                    { type: 'inner', start: 0, end: 100 },
                    ...Array.from({ length: pointCount }, () => ({
                        type: 'point',
                        start: 50,
                        end: 50
                    }))
                ],
                {
                    outer: emptyHooks,
                    point: { replace: () => '' },
                    inner: emptyHooks
                }
            ]
        }
    ];
}

function parseOptions(args: string[]) {
    let filter: string | null = null;
    let samples = 7;
    let targetMs = 250;
    let json = false;
    let list = false;

    for (const argument of args) {
        if (argument.startsWith('--filter=')) {
            filter = argument.slice('--filter='.length);
        } else if (argument.startsWith('--samples=')) {
            samples = parsePositiveInteger(argument, '--samples=');
        } else if (argument.startsWith('--target=')) {
            targetMs = parsePositiveInteger(argument, '--target=');
        } else if (argument === '--json') {
            json = true;
        } else if (argument === '--list') {
            list = true;
        } else {
            throw new Error(`Unknown benchmark option: ${argument}`);
        }
    }

    return { filter, samples, targetMs, json, list };
}

function parsePositiveInteger(argument: string, prefix: string) {
    const value = Number(argument.slice(prefix.length));
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${prefix} requires a positive integer.`);
    }
    return value;
}

function runScenario(scenario: BenchmarkScenario): BenchmarkResult {
    const { input } = scenario;

    for (let iteration = 0; iteration < 3; iteration++) {
        render(...input);
    }

    const probeStart = performance.now();
    render(...input);
    const probeMs = Math.max(performance.now() - probeStart, 0.01);
    const iterations = Math.max(1, Math.min(10_000, Math.round(options.targetMs / probeMs)));
    const durations: number[] = [];
    const heapGrowth: number[] = [];
    let checksum = 0;

    for (let sample = 0; sample < options.samples; sample++) {
        globalThis.gc?.();
        const heapBefore = process.memoryUsage().heapUsed;
        const start = performance.now();

        for (let iteration = 0; iteration < iterations; iteration++) {
            checksum += render(...input).length;
        }

        durations.push((performance.now() - start) / iterations);
        heapGrowth.push((process.memoryUsage().heapUsed - heapBefore) / iterations);
    }

    if (checksum < 0) {
        throw new Error('Unreachable checksum state.');
    }

    durations.sort((left, right) => left - right);
    heapGrowth.sort((left, right) => left - right);
    const medianMs = percentile(durations, 0.5);

    return {
        name: scenario.name,
        spans: input[1].length,
        documentLength: input[0].length,
        iterations,
        medianMs,
        p95Ms: percentile(durations, 0.95),
        operationsPerSecond: 1_000 / medianMs,
        heapGrowthBytes: typeof globalThis.gc === 'function'
            ? percentile(heapGrowth, 0.5)
            : null
    };
}

function percentile(sortedValues: number[], ratio: number) {
    return sortedValues[Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * ratio) - 1)];
}

function printResults(results: BenchmarkResult[]) {
    console.log(
        'scenario'.padEnd(28),
        'spans'.padStart(8),
        'median'.padStart(12),
        'p95'.padStart(12),
        'ops/s'.padStart(12),
        'heap/run'.padStart(12)
    );

    for (const result of results) {
        console.log(
            result.name.padEnd(28),
            String(result.spans).padStart(8),
            `${result.medianMs.toFixed(2)} ms`.padStart(12),
            `${result.p95Ms.toFixed(2)} ms`.padStart(12),
            result.operationsPerSecond.toFixed(1).padStart(12),
            (result.heapGrowthBytes === null
                ? 'n/a'
                : formatBytes(result.heapGrowthBytes)
            ).padStart(12)
        );
    }

    if (typeof globalThis.gc !== 'function') {
        console.log('\nRun Node with --expose-gc to include approximate heap growth per render.');
    }
}

function formatBytes(bytes: number) {
    const absoluteBytes = Math.abs(bytes);
    if (absoluteBytes >= 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    if (absoluteBytes >= 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes.toFixed(0)} B`;
}

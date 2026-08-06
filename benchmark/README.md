# Render Benchmarks

The render benchmark suite covers hot paths that are easy to regress while changing span ordering or boundary traversal:

- disjoint, nested, and crossing spans within one layer;
- section/line composition in both layer orders;
- repeated crossings between layers;
- distributed points, a shared point boundary, and points between active layers.

Run the complete suite:

```bash
npm run benchmark
```

List or filter scenarios:

```bash
npm run benchmark -- --list
npm run benchmark -- --filter=points
```

Tune the sample count and approximate duration of each sample:

```bash
npm run benchmark -- --samples=10 --target=500
```

Use `--json` for machine-readable output.

## Reading Results

- `median` is the median render duration across samples.
- `p95` is the slowest sample at the 95th percentile.
- `ops/s` is derived from the median.
- `heap/run` is approximate heap growth per render before collection. It is useful as a regression signal, not as an allocation profile.

Compare changes on the same machine, Node.js version, and power state. Run the suite more than once before drawing conclusions from small differences. Benchmarks report measurements but do not enforce thresholds.

When adding a renderer feature, add a scenario only when it represents a distinct traversal shape. Keep fixtures deterministic and create them before timing begins.

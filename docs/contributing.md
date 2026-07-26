# Contributing

HiText 2.0 is the active API design. Contributions should use the current sources, layers, hooks, and renderer model rather than preserving patterns from the 1.x beta API.

## Development workflow

Install dependencies and use the focused checks while iterating:

```bash
npm install
npm test
npm run lint
npm run typecheck
```

Before a change is ready, run:

```bash
npm run fast-check
```

Before committing or publishing, run the complete validation:

```bash
npm run check
```

The full check formats lint-fixable code, runs source tests, typechecks, builds every artifact, and tests the built package variants.

## Test the public API

Tests must import application-facing APIs from `src/index.ts` or public type declarations. This validates export coverage and catches changes that work internally but are unavailable to consumers.

Use low-level exports through the public entry point when testing low-level behavior. Do not bypass the package surface with direct internal imports merely to make a test convenient.

## Scope changes narrowly

Place behavior in the module that owns it:

- source analysis in `range-sources/`;
- curried geometry or data operations in `range-compose/`;
- reusable interpretation in `range-hooks/`;
- output materialization in `renderers/` or buffers;
- orchestration in `pipeline.ts`;
- traversal semantics in `render.ts`.

Avoid coupling a range source to one renderer. If behavior needs renderer state, use a range hook factory and explicit renderer context.

## Add a range function

Range functions have stricter design and documentation requirements. A contribution must define:

- source or transformer category;
- callback and currying shape;
- cardinality;
- data behavior;
- origin behavior;
- ordering requirements;
- memory behavior;
- empty, point, overlap, and boundary cases.

Follow [Range Functions Guidelines](range-functions-guidelines.md) for the JSDoc template, mirrored test path, signature patterns, implementation principles, and reference updates.

## Add a renderer or hook utility

Renderer changes should test:

- plain and empty documents;
- nested and crossing ranges;
- `open`, `close`, and `wrap` lifecycle;
- source text conversion;
- replacement and `break`;
- zero-width insertion;
- child and result buffer types;
- state restoration where applicable.

Hook utilities should state whether they are renderer-independent or require factory context. They must tolerate repeated segments of one generated range.

## Documentation sync

Documentation is part of the API change. Update it in the same work when changing:

- signatures, parameters, return types, or exports;
- range data or origin behavior;
- layer, context, hook, renderer, or buffer contracts;
- sorting, segmentation, replacement, or insertion semantics;
- validation requirements or project structure.

At minimum, check [API Reference](api-reference.md), [Range Functions Reference](range-functions-reference.md), relevant guides and recipes, [Glossary](glossary.md), and [Release Notes](release-notes-2.0.md).

If a code change contradicts the development rules in `AGENTS.md`, update that source of truth as part of the same change rather than letting code and contributor guidance diverge.

## Write examples

Examples should import from `hitext`, use the current API, and demonstrate one primary idea. Prefer a small assertion-backed example over a large demo with presentation noise.

When adapting historical examples, verify renamed APIs and changed signatures. In particular, use `rangesConcat()` rather than earlier `concatRanges` names and the numeric `applyFitToWindow(size, allowTrimming?)` signature.

## Pull request checklist

- The implementation follows existing module and naming patterns.
- Tests import through the public API.
- New behavior has focused success and edge-case coverage.
- Data and origin semantics are asserted.
- Documentation and examples match the implementation.
- `npm run fast-check` passes during development.
- `npm run check` passes before the change is committed or released.

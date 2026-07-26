# HiText Documentation

The public documentation is organized around a short path: build one useful result, understand the model, then look up exact behavior only when needed.

## Start

- [Getting Started](getting-started.md) builds a contextual HTML excerpt from independent annotations in one tutorial.
- [Core Concepts](core-concepts.md) is the canonical user model for document coordinates, ranges, layers, intersections, hooks, buffers, and derived views.

## Build

- [Range Functions Guide](range-functions-guide.md) explains how to create, transform, combine, and derive ranges.
- [Rendering](rendering.md) covers range hooks, crossings, replacement, insertion, hiding, and buffer behavior.
- [Renderers](renderers.md) compares string, HTML, TTY, DOM, JSX, and custom output.
- [Recipes](recipes.md) applies the model to excerpts, diagnostics, diffs, logs, redaction, and generated content.

## Reference

- [Range Functions Reference](range-functions-reference.md) contains signatures, data and origin behavior, ordering, cardinality, and edge cases for every range function.
- [API Reference](api-reference.md) lists application-level contracts and inventories root-exported low-level machinery that still requires pre-release API review.

## Upgrade

- [Upgrade to HiText 2.0](upgrade-to-2.0.md) explains the redesign, breaking changes, verified before-and-after examples, and the upgrade checklist.

<details>
<summary>Supporting and maintainer notes</summary>

These pages preserve verified detail and editorial source material, but they are not independent public API contracts or required reading:

- [Layers and Pipeline](layers-and-pipeline.md), [Rendering Model](rendering-model.md), and [Range Hooks](range-hooks.md) contain extended material behind the canonical public guides.
- [Projections and Excerpts](projections-and-excerpts.md), [TypeScript Notes](typescript.md), [Introspection and Debugging](introspection-and-debugging.md), [Performance Notes](performance.md), [Extending HiText](extending-hitext.md), [Glossary](glossary.md), and [FAQ](faq.md) are supporting drafts for later editorial work.
- [Contributing](contributing.md), [Design and Architecture](design-and-architecture.md), [Range Functions Guidelines](range-functions-guidelines.md), and [Computational Model](computational-model.md) are maintainer documentation.
- [Migration from HiText 1.x](migration-from-1.x.md) and [HiText 2.0 Release Notes](release-notes-2.0.md) remain source material for the consolidated upgrade guide.

Pages under `drafts/` are superseded working material.

</details>

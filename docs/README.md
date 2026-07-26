# HiText Documentation

HiText combines independent range annotations over a source document and renders them through an ordered, immutable pipeline. The documentation is organized by task: start with the tutorial, use the guides to understand the model, and use the references when implementing a specific layer or extension.

## Start here

- [Overview](../README.md) introduces the problem, package, and first examples.
- [Getting Started](getting-started.md) builds a pipeline, adds independent layers, derives ranges, uses render options, and inspects intermediate products.
- [Core Concepts](core-concepts.md) defines the document coordinate space, ranges, layers, segments, hooks, buffers, and projections.
- [Computational Model](computational-model.md) states the source, annotation, evaluation, interpretation, and materialization stages precisely.

## Guides

- [Layers and Pipeline](layers-and-pipeline.md) covers immutable construction, dependencies, generation context, options, reuse, and pipeline products.
- [Range Functions Guide](range-functions-guide.md) explains how to choose and compose range sources and transformers.
- [Range Hooks](range-hooks.md) explains `open`, `close`, `wrap`, `text`, `replace`, `break`, and hook context.
- [Renderers](renderers.md) covers string, HTML, TTY, DOM, JSX, and custom renderers.
- [Projections and Excerpts](projections-and-excerpts.md) shows how to retain annotated context while hiding or replacing omitted regions.
- [Introspection and Debugging](introspection-and-debugging.md) works from generated ranges through hook resolution and segment tracing.
- [TypeScript](typescript.md) explains pipeline generics and typed range data, options, hooks, and renderers.
- [Performance](performance.md) describes cost factors, allocations, reuse, large documents, bundle measurement, and non-guarantees.
- [Extending HiText](extending-hitext.md) builds custom sources, transformers, hook utilities, and structured renderers.

## Examples

- [Recipes](recipes.md) covers highlighting, excerpts, line numbers, diff context, diagnostics, logs, progressive detail, redaction, and generated documents.
- [Projections and Excerpts](projections-and-excerpts.md) develops search snippets, horizontal windows, folding, omission kinds, and output budgets.

## Reference

- [API Reference](api-reference.md) describes the public package exports and pipeline surface.
- [Range Functions Reference](range-functions-reference.md) documents every built-in range source and transformer.
- [Rendering Model](rendering-model.md) specifies ordering, crossing ranges, segmentation, stack behavior, hook order, and buffer nesting.
- [Glossary](glossary.md) defines the terminology used across the project.

## Project

- [Design and Architecture](design-and-architecture.md) explains module boundaries and the rationale for ranges, layers, segments, hooks, and buffers.
- [Migration from HiText 1.x](migration-from-1.x.md) maps the previous chain-oriented model to HiText 2.0.
- [HiText 2.0 Release Notes](release-notes-2.0.md) presents the redesign and its new capabilities.
- [FAQ](faq.md) answers scope, overlap, output, streaming, editor, and origin questions.
- [Contributing](contributing.md) defines validation, public API testing, documentation sync, and change workflows.
- [Range Functions Guidelines](range-functions-guidelines.md) defines implementation and documentation rules for contributors adding range functions.

## Reading paths

For a first integration:

```text
Getting Started -> Core Concepts -> Layers and Pipeline -> Range Functions Guide
```

For excerpts, folding, or generated views:

```text
Core Concepts -> Projections and Excerpts -> Recipes
```

For a new output format:

```text
Range Hooks -> Rendering Model -> Renderers -> Extending HiText
```

For architecture and contribution work:

```text
Computational Model -> Design and Architecture -> Contributing
```

For a 1.x upgrade:

```text
HiText 2.0 Release Notes -> Migration from HiText 1.x -> Getting Started
```

For typed integrations:

```text
TypeScript -> API Reference
```

For diagnosing traversal behavior:

```text
Introspection and Debugging -> Rendering Model -> FAQ
```

For contributing a range function:

```text
Range Functions Guidelines -> Contributing
```

The pages in `drafts/` are working material. They are not part of the public documentation set and may contain incomplete or superseded descriptions.

# HiText Documentation

HiText combines independent range annotations over a source document and renders them through an ordered, immutable pipeline. The documentation is organized by task: start with the tutorial, use the guides to understand the model, and use the references when implementing a specific layer or extension.

## Start here

- [Getting Started](getting-started.md) builds a pipeline, adds independent layers, derives ranges, uses render options, and inspects intermediate products.
- [Core Concepts](core-concepts.md) defines the document coordinate space, ranges, layers, segments, hooks, buffers, and projections.

## Guides

- [Range Hooks](range-hooks.md) explains `open`, `close`, `wrap`, `text`, `replace`, `break`, and hook context.
- [Renderers](renderers.md) covers string, HTML, TTY, DOM, JSX, and custom renderers.
- [Projections and Excerpts](projections-and-excerpts.md) shows how to retain annotated context while hiding or replacing omitted regions.
- [Recipes](recipes.md) collects focused compositions for common tasks.
- [TypeScript](typescript.md) explains pipeline generics and typed range data, options, hooks, and renderers.

## Reference

- [API Reference](api-reference.md) describes the public package exports and pipeline surface.
- [Range Functions Reference](range-functions-reference.md) documents every built-in range source and transformer.

## Project

- [Migration from HiText 1.x](migration-from-1.x.md) maps the previous chain-oriented model to HiText 2.0.
- [Range Functions Guidelines](range-functions-guidelines.md) defines implementation and documentation rules for contributors adding range functions.

## Reading paths

For a first integration:

```text
Getting Started -> Core Concepts -> Range Functions Reference
```

For excerpts, folding, or generated views:

```text
Core Concepts -> Projections and Excerpts -> Recipes
```

For a new output format:

```text
Range Hooks -> Renderers -> API Reference
```

The pages in `drafts/` are working material. They are not part of the public documentation set and may contain incomplete or superseded descriptions.

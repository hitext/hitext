# HiText Documentation

HiText documentation is organized into three tracks.

## User Guide

Read these chapters in order:

1. [HiText](1-intro.md) introduces the source-coordinate model, spans, layers, and late materialization.
2. [Building a Diagnostic View](2-building-a-diagnostics-view.md) develops one complete view step by step.
3. [Thinking in Spans](3-thinking-in-spans.md) generalizes the patterns demonstrated by the tutorial.
4. [Span Sources and Transformations](4-span-sources-and-transformations.md) explains how spans enter and move through a composition.
5. [Layers and Materialization](5-layers-and-materialization.md) binds analytical span sources to output-specific hooks and explains how to choose structural layer order.
6. [Rendering Overlapping Spans](6-rendering-overlapping-spans.md) defines intersections, directional fragmentation, point placement, replacement, interruption, and debugging.
7. [Creating a Custom Renderer](create-custom-renderer.md) builds a structured output target on that render model.

The first five chapters cover normal application use. Chapters 6 and 7 are primarily for advanced hooks and custom renderers.

## API Reference

- [Span Functions Reference](span-functions-reference.md) documents public span sources and transformations.
- [Pipeline and Rendering Reference](pipeline-and-rendering-reference.md) documents pipelines, layers, hooks, contexts, ordering, and renderer contracts.

## Contributor Guide

- [Span Functions Guidelines](span-functions-guidelines.md) defines implementation, testing, and documentation requirements for adding or changing span functions in HiText itself.

This contributor guide is not required for using the public API.

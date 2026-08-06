# Practical Examples

These examples start where the introductory tutorial ends. Each one emphasizes a different relationship between spans rather than another variation of basic highlighting.

All span offsets continue to address the original input. Selection, omission, generated content, and styling happen only when the pipeline renders that input.

## Focus a search result without slicing the source

A match can define a horizontal viewport. Its complement then describes everything that should be omitted.

```js
import {
    applyFitToWindow,
    applyInvert,
    applyMerge,
    html,
    spanHooksHide,
    spansCompose,
    spansFromLayer,
    spansFromMatch
} from 'hitext';

const searchResults = html()
    .addLayer(
        spansFromMatch(/timeout/gi),
        content => `<mark>${content}</mark>`,
        'matches'
    )
    .addLayer(
        spansCompose(
            spansFromLayer('matches'),
            applyFitToWindow(42),
            applyMerge()
        ),
        null,
        'visible'
    )
    .addLayer(
        spansCompose(
            spansFromLayer('visible'),
            applyInvert()
        ),
        spanHooksHide({ ellipsis: '...' })
    );

const log = 'Connecting to primary database failed: timeout after 30 seconds; retrying with replica.';

searchResults.render(log);
// ...database failed: <mark>timeout</mark> after 30 seconds;...
```

The `visible` layer is analytical. It contributes no output itself; it names geometry that the omission layer reuses. With several nearby matches, `applyMerge()` combines overlapping windows before they are inverted.

Use this pattern for search snippets, long log lines, narrow previews, or any view that needs a bounded amount of horizontal context.

## Change detail without rebuilding the pipeline

Render options can select different span sources for each call while the configured view remains immutable.

```js
import {
    applyExpandTo,
    applyInvert,
    applyMerge,
    spanHooksHide,
    spansCompose,
    spansConcat,
    spansFrom,
    spansFromMatch,
    spansFromOptions,
    string
} from 'hitext';

const headings = spansFromMatch(/^#.+$/gm);
const summaries = spansFromMatch(/^Summary:.*$/gm);

const selected = spansFromOptions(({ detail = 'summary' }) => {
    if (detail === 'full') {
        return spansFrom('document');
    }

    return detail === 'outline'
        ? headings
        : spansConcat(headings, summaries);
});

const progressive = string().addLayer(
    spansCompose(
        selected,
        applyExpandTo('line'),
        applyMerge(),
        applyInvert()
    ),
    spanHooksHide({ skippedLines: '    ...' })
);

const documentation = [
    '# Authentication',
    'Summary: Use API keys.',
    'Details: Send the key in the Authorization header.',
    '# Rate limits',
    'Summary: 1000 requests per hour.',
    'Details: Limits apply per API key.'
].join('\n');

progressive.render(documentation, { detail: 'outline' });
progressive.render(documentation, { detail: 'summary' });
progressive.render(documentation, { detail: 'full' });
```

`outline` retains headings, `summary` also retains summary lines, and `full` selects the complete document so its complement is empty. The pipeline graph is unchanged across all three renders.

Use the same structure for log severity filters, folding levels, compact reports, or role-dependent disclosure.

## Redact independent kinds of sensitive data

Replacement consumes a selected source region while every other span keeps its original coordinates.

```js
import { spansFromMatch, string } from 'hitext';

const safeLog = string()
    .addLayer(
        spansFromMatch(/[\w.+-]+@[\w.-]+\.\w+/g),
        { replace: () => '[email]' }
    )
    .addLayer(
        spansFromMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g),
        { replace: () => '[ip]' }
    );

safeLog.render('Login for dev@example.com from 192.168.1.20');
// Login for [email] from [ip]
```

The email and IP sources analyze the same unmodified log entry. Neither pattern can accidentally match replacement text emitted by the other layer.

For HTML output, remember that the HTML renderer escapes source chunks, while strings returned by hooks are renderer instructions. Escape untrusted values before interpolating them into hook-generated markup.

## Aggregate many spans into one generated block

Named layers are also data dependencies. A custom source can read every generated heading and create one point span carrying a table of contents.

```js
import {
    applyDataMap,
    spansCompose,
    spansFromMatch,
    string
} from 'hitext';

const slug = text => text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

const headings = spansCompose(
    spansFromMatch(/^(#{1,6})\s+(.+)$/gm),
    applyDataMap(({ data: [, marks, text] }) => ({
        level: marks.length,
        text,
        slug: slug(text)
    }))
);

function spansFromToc(_document, createSpan, { spansByName }) {
    const items = spansByName.headings ?? [];

    if (items.length > 0) {
        createSpan(0, 0, items.map(({ data }) => data));
    }
}

const markdownWithToc = string()
    .addLayer(headings, null, 'headings')
    .addLayer(spansFromToc, {
        replace: ({ data }) => [
            'Table of contents',
            ...data.map(({ level, text, slug }) =>
                `${'  '.repeat(level - 1)}- ${text} (#${slug})`
            ),
            ''
        ].join('\n'),
        point: 'outside'
    });

markdownWithToc.render([
    '# Guide',
    '',
    '## Install',
    '',
    'Run npm install.'
].join('\n'));
```

The heading layer is analytical. The second source aggregates its data and anchors generated output at document offset `0`. Explicit `point: 'outside'` keeps that block outside any rendered span touching the document start.

This pattern also builds action-item summaries, reference lists, timelines, indexes, and report headers.

## Materialize semantic status as terminal styles

The analytical source does not need to emit ANSI sequences. The TTY renderer supplies target-specific hook factories.

```js
import { spansFromMatch, tty } from 'hitext';

const statusView = tty().addLayer(
    spansFromMatch(/RUNNING|WARNING|ERROR/g),
    tty.createStyleMap(
        {
            RUNNING: 'green',
            WARNING: 'yellow',
            ERROR: 'red'
        },
        ({ spanText }) => spanText
    )
);

statusView.render([
    'API: RUNNING',
    'Cache: WARNING',
    'Worker: ERROR'
].join('\n'));
```

The renderer restores surrounding foreground and background state across nested and crossing spans. The same status spans can support an HTML, DOM, or JSX view with different hooks.

## Combine the patterns

These examples are deliberately small, but their relationships compose:

```text
root annotations
    -> selected or expanded regions
    -> merged visible geometry
    -> omitted complement
    -> target-specific materialization

named analytical layer
    -> aggregate point span
    -> generated summary
```

A focused incident view can filter logs by render option, retain context around errors, redact credentials, add a generated summary, and style severities for its target without translating any source offset.

For a complete layer-by-layer construction, continue with [Building a Diagnostic View](2-building-a-diagnostics-view.md). For the full source and transformation contracts, use the [Span Functions Reference](span-functions-reference.md).

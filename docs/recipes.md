# Recipes

These recipes focus on tasks where several independent annotations or transformations must remain correct in one result. For basic matching and layer construction, start with [Getting Started](getting-started.md).

## Search excerpts across annotation classes

```js
import {
    applyExpandTo,
    applyInvert,
    html,
    rangesCompose,
    rangesConcat,
    rangesForMatch,
    rangesFromLayer
} from 'hitext';

const document = [
    'startup',
    'warning: slow query',
    'context',
    'error: timeout',
    'shutdown'
].join('\n');

const report = html()
    .addLayer(
        rangesForMatch(/error/gi),
        content => `<span class="error">${content}</span>`,
        'errors'
    )
    .addLayer(
        rangesForMatch(/warning/gi),
        content => `<span class="warning">${content}</span>`,
        'warnings'
    )
    .addLayer(
        rangesCompose(
            rangesConcat(
                rangesFromLayer('errors'),
                rangesFromLayer('warnings')
            ),
            applyExpandTo('line'),
            applyInvert(true)
        ),
        { replace: () => '...\n' }
    );
```

`rangesConcat()` combines sources without changing their geometry. The derived viewport depends on both named layers.

```js
report.render(document);
```

Output:

```html
...
<span class="warning">warning</span>: slow query
...
<span class="error">error</span>: timeout
...
```

## Redact sensitive spans

```js
import { rangesForMatch, string } from 'hitext';

const redact = string().addLayer(
    rangesForMatch(/token=\w+/g),
    { replace: () => 'token=[redacted]' }
);

redact.render('user=ann token=secret action=login');
// user=ann token=[redacted] action=login
```

Contained annotations are skipped with the replaced text. Keep secret values out of hook output and logs.

## Render diff context

Use one analytical layer to identify changed lines, independent layers to style additions and removals, and a derived layer to omit distant context:

```js
import {
    applyExpandTo,
    applyInvert,
    html,
    rangesCompose,
    rangesForMatch,
    rangesFromLayer
} from 'hitext';

const document = [
    '  unchanged before',
    '-old value',
    '+new value',
    '  unchanged after'
].join('\n');

const diff = html()
    .addLayer(
        rangesForMatch(/^[-+]/gm),
        null,
        'changes'
    )
    .addLayer(
        rangesForMatch(/^-.*$/gm),
        content => `<del>${content}</del>`
    )
    .addLayer(
        rangesForMatch(/^\+.*$/gm),
        content => `<ins>${content}</ins>`
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('changes'),
            applyExpandTo('line'),
            applyInvert(true)
        ),
        { replace: () => '... unchanged lines ...\n' }
    );
```

The analytical `changes` layer drives the viewport but renders nothing. Styling layers remain independent and survive inside retained context.

```js
diff.render(document);
```

Output:

```html
... unchanged lines ...
<del>-old value</del>
<ins>+new value</ins>
... unchanged lines ...
```

## Show a diagnostic with a suggestion

This pipeline combines a contextual excerpt, line-prefix insertion, highlighting, and a suggestion inserted at the diagnostic end:

```js
const document = [
    'function check(user) {',
    '    if (user.age = 18) {',
    '        return true;',
    '    }',
    '}'
].join('\n');
```

```js
import {
    applyCollapseTo,
    applyExpandTo,
    applyInvert,
    html,
    rangeHooksHide,
    rangesCompose,
    rangesForLines,
    rangesForMatch,
    rangesFromLayer
} from 'hitext';

const diagnostic = html()
    .addLayer(
        rangesForMatch(/\bif \([^)]*[^=!<>]=(?!=)[^)]*\)/g),
        null,
        'errors'
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('errors'),
            applyExpandTo('line', 1),
            applyInvert()
        ),
        rangeHooksHide()
    )
    .addLayer(
        rangesForLines('line-start'),
        {
            replace: ({ data: line }) =>
                `<span class="line-number">${line}</span> `
        }
    )
    .addLayer(
        rangesFromLayer('errors'),
        content => `<mark class="error">${content}</mark>`
    )
    .addLayer(
        rangesCompose(
            rangesFromLayer('errors'),
            applyCollapseTo('end')
        ),
        {
            replace: () =>
                '<span class="suggestion">Use == or === for comparison</span>'
        }
    );
```

All insertion points remain tied to the original document. The line-number layer does not need to know which lines the projection will omit.

```js
diagnostic.render(document);
```

Output:

```html
<span class="line-number">1</span> function check(user) {
<span class="line-number">2</span>     <mark class="error">if (user.age = 18)</mark><span class="suggestion">Use == or === for comparison</span> {
<span class="line-number">3</span>         return true;
```

The closing lines are omitted, while highlighting, line insertion, and the generated suggestion remain correctly positioned.

## Generate a Markdown table of contents

This example turns heading matches into structured data, collapses them to one insertion point, merges them, and uses the merged origin array to generate a new block:

```js
const document = [
    '# Main',
    '',
    '## Install',
    'Text',
    '',
    '## Usage',
    'More'
].join('\n');
```

```js
import {
    applyCollapseTo,
    applyDataMap,
    applyMerge,
    rangesCompose,
    rangesForMatch,
    rangesFromLayer,
    string
} from 'hitext';

const headings = rangesCompose(
    rangesForMatch(/^(#{1,6})\s+(.+)$/gm),
    applyDataMap(range => {
        const [, hashes, text] = range.data;

        return {
            level: hashes.length,
            text,
            slug: text
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]/g, '')
        };
    })
);

const withToc = string()
    .addLayer(headings, null, 'headings')
    .addLayer(
        rangesCompose(
            rangesFromLayer('headings'),
            applyCollapseTo('document-start'),
            applyMerge()
        ),
        {
            replace: ({ range }) => [
                '## Table of contents',
                ...range.origin.map(({ data }) =>
                    `${'  '.repeat(data.level - 1)}- ` +
                    `[${data.text}](#${data.slug})`
                ),
                ''
            ].join('\n')
        }
    );
```

`applyDataMap()` clears the original match lineage because it changes semantic data. `applyCollapseTo()` then establishes each enriched heading as the origin of its insertion point, and `applyMerge()` aggregates those points.

This pattern generalizes to footnote appendices, link definitions, summaries, and other generated document sections.

```js
withToc.render(document);
```

Output:

```markdown
## Table of contents
- [Main](#main)
    - [Install](#install)
    - [Usage](#usage)
# Main

## Install
Text

## Usage
More
```

The original headings remain in place. Their enriched data is also aggregated at the document start to produce a new section.

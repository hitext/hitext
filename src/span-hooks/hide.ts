import type { SpanHooks } from '../types.js';

type TrimSide = 'start' | 'middle' | 'end';
type EllipsisHook<V> = (side: TrimSide) => V;
type EllipsisValue<V> = V | EllipsisHook<V>;

type NewlinePlacement = 'before' | 'after' | 'both';
type SkippedLinesHook<V> = (newline: NewlinePlacement) => V;
type SkippedLinesValue<V> = V | SkippedLinesHook<V>;

/**
 * Creates span hooks for viewport/windowing scenarios with smart truncation indicators.
 *
 * This factory generates hooks that display truncation markers when content is hidden:
 * - `replace`: Used for completely skipped/hidden spans (e.g., lines outside viewport)
 * - `close`: Used when content is trimmed from the start (span doesn't start at line start)
 * - `open`: Used when content is trimmed from the end (span doesn't end at line content end)
 *
 * The hooks intelligently handle multi-line spans:
 * - For skipped lines: shows markers for each hidden line
 * - For partial line trimming: adds markers only where content was cut
 *
 * The factory works with any renderer type (string, DOM, JSX, etc.) by using the context's
 * createBuffer() method for output construction.
 *
 * @param options - Configuration options
 * @param options.ellipsis - Content for trimmed spans. Can be:
 *   - A static value (string, T, or R)
 *   - A function receiving 'start' | 'middle' | 'end' indicating trim position
 *     ('middle' is for same-line cuts like `foo bar baz` -> `foo...baz` to avoid double markers)
 *   Default: '…'
 * @param options.skippedLines - Content for completely skipped lines. Can be:
 *   - A static value (string, T, or R)
 *   - A function receiving 'before' | 'after' | 'both' indicating newline placement
 *   Default: '...'
 * @returns Span hooks object with replace, open, and close hooks
 *
 * @example
 * // Basic viewport with default ellipsis
 * html()
 *   .addLayer(spansFromMatch(/error/g), highlight)
 *   .addLayer(
 *     spansCompose(
 *       spansFromMatch(/error/g),
 *       applyExpandTo('line', 1),
 *       applyInvert()
 *     ),
 *     spanHooksHide()
 *   )
 *
 * @example
 * // Custom truncation markers with functions
 * html()
 *   .addLayer(hiddenSpans, spanHooksHide({
 *     ellipsis: (side) => side === 'middle' ? '…' : '...',
 *     skippedLines: (newline) => newline === 'both' ? '\n---\n' : '---'
 *   }))
 *
 * @example
 * // DOM renderer with custom elements
 * dom()
 *   .addLayer(hiddenSpans, spanHooksHide({
 *     ellipsis: document.createElement('span').className = 'ellipsis',
 *     skippedLines: () => {
 *       const el = document.createElement('div');
 *       el.className = 'skipped-lines';
 *       el.textContent = '...';
 *       return el;
 *     }
 *   }))
 */
export function spanHooksHide<T = unknown, R = T>(options: {
    ellipsis?: EllipsisValue<T | R>;
    skippedLines?: SkippedLinesValue<T | R>;
} = {}): Partial<SpanHooks<unknown, T, R>> {
    const {
        ellipsis = '…',
        skippedLines = '...'
    } = options;

    // Normalize to functions
    const ellipsisFn = typeof ellipsis === 'function'
        ? ellipsis as EllipsisHook<T | R>
        : () => ellipsis;
    const skippedLinesFn = typeof skippedLines === 'function'
        ? skippedLines as SkippedLinesHook<T | R>
        : () => skippedLines;

    return {
        break: true,

        replace(context) {
            const { start, end, lines, createBuffer } = context;
            const lineDiff = lines.getLineDiff(start, end);

            // Determine if span should be replaced entirely (vs. partial replacement)
            const shouldReplace =
                // Multi-line spans (2+ lines) are always replaced
                lineDiff >= 2 ||
                // Single or 1-line span at document boundaries
                (lineDiff >= 1 && (start === 0 || lines.isLineEnd(end))) ||
                // Entire line is covered (from line start to line content end)
                (lineDiff >= 0 && lines.isLineStart(start) && lines.isLineContentEnd(end));

            if (!shouldReplace) {
                // For partial line spans, check if it spans multiple lines
                if (!lines.isSameLine(start, end)) {
                    // Multi-line partial span: preserve newline so close/open appear on separate lines
                    // Return the newline character(s) at the end of the start line
                    return lines.getNewlineText(start);
                } else {
                    // Single-line partial span: return single marker to avoid double markers
                    return ellipsisFn('middle');
                }
            }

            // Build replacement with appropriate newlines
            const hasLeadingNewline = !lines.isLineStart(start) && start > 0;
            const hasTrailingNewline = !lines.isLineContentEnd(end) || lines.isLineEnd(end);

            // Determine newline placement for the callback
            let newlinePlacement: NewlinePlacement;
            if (hasLeadingNewline && hasTrailingNewline) {
                newlinePlacement = 'both';
            } else if (hasLeadingNewline) {
                newlinePlacement = 'before';
            } else if (hasTrailingNewline) {
                newlinePlacement = 'after';
            } else {
                // No newlines needed - just return the content
                return skippedLinesFn('after');
            }

            // If we need to combine multiple parts, use buffer
            const buffer = createBuffer();

            // Add leading newline if needed
            if (hasLeadingNewline) {
                buffer.append('\n');
            }

            buffer.append(skippedLinesFn(newlinePlacement));

            // Add trailing newline if needed
            if (hasTrailingNewline) {
                buffer.append('\n');
            }

            return buffer.emit();
        },

        close({ start, end, lines }) {
            // Add marker if: multi-line span and content trimmed from right
            return !lines.isSameLine(start, end) && start > lines.getLineStart(start)
                ? ellipsisFn('end')
                : null;
        },

        open({ start, end, lines }) {
            // Add marker if: multi-line span and content trimmed from left
            return !lines.isSameLine(start, end) && end < lines.getLineContentEnd(end)
                ? ellipsisFn('start')
                : null;
        }
    };
}

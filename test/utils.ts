import type { GeneratedSpan, SpansSource, SpanTuple } from '../src/types.js';


export function spanWithoutMarker<Data>(spans: GeneratedSpan<Data>[]): SpanTuple[] {
    return spans.map(r => [r.start, r.end, r.data, r.origin]);
}

/**
 * Helper function to extract [start, end, data] tuples from spans.
 * Useful for asserting span positions and data in tests.
 */
export function startEndData<Data>(spans: GeneratedSpan<Data>[]): Array<[number, number, Data?]> {
    return spans.map(r => [r.start, r.end, r.data]);
}

/**
 * Helper function to extract [start, end] tuples from spans.
 * Useful for asserting span positions without data in tests.
 */
export function startEnd(spans: Array<{ start: number; end: number }>): Array<[number, number]> {
    return spans.map(r => [r.start, r.end]);
}

/**
 * Helper function to create a RegExpExecArray-like object for testing.
 * This mimics the structure returned by RegExp.exec().
 */
export function regexpMatch(input: string, match: string[] | null, index: number) {
    return match ? Object.assign(match, { input, index, groups: undefined }) : null;
}

/**
 * Helper function to extract spans from regex matches.
 * Returns an array of [start, end] tuples for each match.
 */
export function getMatchSpans(document: string, regex: RegExp): Array<[number, number]> {
    const spans: Array<[number, number]> = [];
    for (const match of document.matchAll(regex)) {
        spans.push([match.index!, match.index! + match[0].length]);
    }
    return spans;
}

/**
 * Helper function to create document boundary point spans for testing.
 * Avoids magic numbers like [[0, 0]] or [[length, length]] in tests.
 *
 * @example
 * documentPoint('start')           // [[0, 0]]
 * documentPoint('end', document)   // [[document.length, document.length]]
 */
export function documentPoint(position: 'start', document?: string): Array<[number, number]>;
export function documentPoint(position: 'end', document: string): Array<[number, number]>;
export function documentPoint(position: 'start' | 'end', document?: string): Array<[number, number]> {
    if (position === 'start') {
        return [[0, 0]];
    }
    if (document === undefined) {
        throw new Error('documentPoint("end") requires document parameter');
    }
    return [[document.length, document.length]];
}

/**
 * Helper function to render spans as an array of substrings from the document.
 * This allows us to test span generators directly without using the full pipeline.
 * Preserves the order of spans as provided.
 */
export function renderSpans<Data, RenderOptions>(
    document: string,
    spans: SpansSource<Data, RenderOptions>,
    renderOptions?: RenderOptions
): string[] {
    const result: string[] = [];

    // Generate spans using a simple collector
    if (typeof spans === 'function') {
        spans(document, (start, end) => {
            result.push(document.slice(start, end));
        }, { renderOptions });
    } else {
        for (const span of spans) {
            const [start, end] = Array.isArray(span) ? span : [span.start, span.end];
            result.push(document.slice(start, end));
        }
    }

    return result;
}

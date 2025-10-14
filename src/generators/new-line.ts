import { CreateRange } from '../index.js';
import { newLineLength } from './utils.js';

export function rangeNewlines(source: string, createRange: CreateRange) {
    let line = 1;

    for (let i = 0; i < source.length; i++) {
        const nl = newLineLength(source, i);

        if (nl !== 0) {
            createRange(i, i + nl, line++);
            i += nl - 1;
        }
    }
};

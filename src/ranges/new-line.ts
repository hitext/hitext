import { CreateRange } from '../index.js';

export function rangeNewlines(source: string, createRange: CreateRange) {
    const newlineRegex = /\r\n|\r|\n/g;
    let line = 1;
    let match;

    while ((match = newlineRegex.exec(source))) {
        createRange(match.index, match.index + match[0].length, line++);
    }
};

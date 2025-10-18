import { CreateRange } from '../types.js';

export function rangeLineContents(source: string, createRange: CreateRange) {
    const newlineRegex = /\r\n|\r|\n/g;
    let line = 1;
    let lineStart = 0;
    let match;

    while ((match = newlineRegex.exec(source))) {
        createRange(lineStart, match.index, line++);
        lineStart = match.index + match[0].length;
    }

    createRange(lineStart, source.length, line++);
};

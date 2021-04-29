import { newLineLength } from './utils';

export default (source: string, createRange: (start: number, end: number, data: number) => void) => {
    let line = 1;

    for (let i = 0; i < source.length; i++) {
        const nl = newLineLength(source, i);

        if (nl !== 0) {
            createRange(i, i + nl, line++);
            i += nl - 1;
        }
    }
};

import { deepStrictEqual } from 'assert';
import { applyResetOrigin, generateSpans } from '../../src/index.js';
import { spanWithoutMarker } from '../utils.js';

describe('applyResetOrigin', () => {
    it('should discard existing origin', () => {
        const input = [{ start: 0, end: 5, data: 'test', origin: { start: 10, end: 20, data: 'old' } }];
        const spans = generateSpans('hello world', applyResetOrigin()(input));
        deepStrictEqual(spanWithoutMarker(spans), [[0, 5, 'test', undefined]]);
    });

    it('should keep origin undefined when no existing origin', () => {
        const spans = generateSpans('hello world', applyResetOrigin()([[0, 5], [6, 11]]));
        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 5, undefined, undefined],
            [6, 11, undefined, undefined]
        ]);
    });

    it('should preserve data while discarding origin', () => {
        const input = [
            { start: 0, end: 5, data: { type: 'word', value: 'hello' } },
            { start: 6, end: 11, data: { type: 'word', value: 'world' } }
        ];
        const spans = generateSpans('hello world', applyResetOrigin()(input));
        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 5, { type: 'word', value: 'hello' }, undefined],
            [6, 11, { type: 'word', value: 'world' }, undefined]
        ]);
    });

    it('should discard complex array origins', () => {
        const input = [
            {
                start: 0,
                end: 5,
                data: 'a',
                origin: [
                    { start: 100, end: 105, data: 'orig1' },
                    { start: 200, end: 205, data: 'orig2' }
                ]
            },
            { start: 6, end: 11, data: 'b', origin: { start: 300, end: 305, data: 'orig3' } }
        ];
        const spans = generateSpans('hello world test', applyResetOrigin()(input));
        deepStrictEqual(spanWithoutMarker(spans), [
            [0, 5, 'a', undefined],
            [6, 11, 'b', undefined]
        ]);
    });
});

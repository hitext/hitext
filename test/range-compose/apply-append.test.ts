import { deepStrictEqual } from 'assert';
import { applyAppend, generateRanges, rangesFrom } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyAppend', () => {
    it('should pass through input ranges unchanged', () => {
        const input = [
            { start: 0, end: 5, data: 'hello' },
            { start: 6, end: 11, data: 'world' }
        ];

        const ranges = generateRanges(
            'hello world',
            applyAppend<string, unknown>()(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'hello'],
            [6, 11, 'world']
        ]);
    });

    it('should append ranges from single source', () => {
        const input = [{ start: 0, end: 5, data: 'input' }];
        const additional = [{ start: 6, end: 11, data: 'appended' }];

        const ranges = generateRanges(
            'hello world',
            applyAppend<string, unknown>(additional)(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'input'],
            [6, 11, 'appended']
        ]);
    });

    it('should append ranges from multiple sources', () => {
        const input = [{ start: 0, end: 5, data: 'input' }];
        const source1 = [{ start: 6, end: 11, data: 'first' }];
        const source2 = [{ start: 12, end: 16, data: 'second' }];

        const ranges = generateRanges(
            'hello world test',
            applyAppend<string, unknown>(source1, source2)(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'input'],
            [6, 11, 'first'],
            [12, 16, 'second']
        ]);
    });

    it('should work with empty input', () => {
        const additional = [{ start: 0, end: 5, data: 'only' }];

        const ranges = generateRanges(
            'hello world',
            applyAppend<string, unknown>(additional)([])
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'only']
        ]);
    });

    it('should work with no additional sources', () => {
        const input = [{ start: 0, end: 5, data: 'input' }];

        const ranges = generateRanges(
            'hello world',
            applyAppend<string, unknown>()(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'input']
        ]);
    });

    it('should work with generator functions', () => {
        const input = [{ start: 0, end: 5, data: 'input' }];

        const ranges = generateRanges(
            'hello world',
            applyAppend<any, unknown>(
                rangesFrom('document-start'),
                rangesFrom('document-end')
            )(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'input'],
            [0, 0, undefined],  // document-start
            [11, 11, undefined] // document-end
        ]);
    });

    it('should preserve origins from all sources', () => {
        const inputOrigin = { start: 100, end: 105, data: 'input-root' };
        const appendOrigin = { start: 200, end: 205, data: 'append-root' };

        const input = [{ start: 0, end: 5, data: 'input', origin: inputOrigin }];
        const additional = [{ start: 6, end: 11, data: 'appended', origin: appendOrigin }];

        const ranges = generateRanges(
            'hello world',
            applyAppend<string, unknown>(additional)(input)
        );

        deepStrictEqual(ranges[0].origin, inputOrigin);
        deepStrictEqual(ranges[1].origin, appendOrigin);
    });

    it('should allow further transformations on combined result', () => {
        const input = [{ start: 0, end: 5, data: 1 }];
        const additional = [{ start: 6, end: 11, data: 2 }];

        const ranges = generateRanges(
            'hello world',
            applyAppend<number, unknown>(additional)(input)
        );

        // Verify we got both ranges (they can be transformed further)
        deepStrictEqual(ranges.length, 2);
        deepStrictEqual(startEndData(ranges), [
            [0, 5, 1],
            [6, 11, 2]
        ]);
    });
});

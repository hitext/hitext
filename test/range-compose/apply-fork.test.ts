import { deepStrictEqual } from 'assert';
import { applyFork, applyCollapseTo, applyDataMap, generateRanges } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('applyFork', () => {
    it('should pass through originals and append transformed copies', () => {
        const input = [
            { start: 0, end: 5, data: 'hello' },
            { start: 6, end: 11, data: 'world' }
        ];

        const ranges = generateRanges(
            'hello world',
            applyFork<string, unknown>(
                applyDataMap(() => 'transformed')
            )(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'hello'],      // original
            [6, 11, 'world'],     // original
            [0, 5, 'transformed'], // transformed
            [6, 11, 'transformed'] // transformed
        ]);
    });

    it('should work with multiple transformers in sub-pipeline', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const ranges = generateRanges(
            'hello',
            applyFork<any, unknown>(
                applyCollapseTo('start'),
                applyDataMap(() => 'marker')
            )(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'test'],   // original
            [0, 0, 'marker']  // collapsed + transformed
        ]);
    });

    it('should handle empty input', () => {
        const ranges = generateRanges(
            'test',
            applyFork<any, unknown>(
                applyDataMap(() => 'x')
            )([])
        );

        deepStrictEqual(ranges, []);
    });

    it('should preserve origins in originals', () => {
        const origin = { start: 100, end: 200, data: 'root' };
        const input = [{ start: 0, end: 5, data: 'test', origin }];

        const ranges = generateRanges(
            'hello',
            applyFork<string, unknown>(
                applyDataMap(() => 'new')
            )(input as any)
        );

        // Original keeps its origin
        deepStrictEqual(ranges[0].origin, origin);
        // Transformed copy has undefined origin (cleared by applyDataMap)
        deepStrictEqual(ranges[1].origin, undefined);
    });

    it('should work with no transformers (just duplicates)', () => {
        const input = [{ start: 0, end: 5, data: 'test' }];

        const ranges = generateRanges(
            'hello',
            applyFork<string, unknown>()(input)
        );

        // Original + copy (no transformations applied)
        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'test'],
            [0, 5, 'test']
        ]);
    });

    it('should allow further transformations on combined result', () => {
        const input = [{ start: 0, end: 5, data: 1 }];

        const ranges = generateRanges(
            'hello',
            applyFork<number, unknown>(
                applyDataMap((range: any) => range.data * 2)
            )(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 1], // original
            [0, 5, 2]  // transformed (doubled)
        ]);
    });

    it('should work with line-based transformations', () => {
        const input = [
            { start: 0, end: 5, data: 'error' },
            { start: 6, end: 11, data: 'warning' }
        ];

        const ranges = generateRanges(
            'hello\nworld',
            applyFork<string, unknown>(
                applyCollapseTo('line-start')
            )(input)
        );

        deepStrictEqual(startEndData(ranges), [
            [0, 5, 'error'],     // original
            [6, 11, 'warning'],  // original
            [0, 0, 'error'],     // line-start of first
            [6, 6, 'warning']    // line-start of second
        ]);
    });
});

import { deepStrictEqual } from 'assert';
import { generateRanges, rangesForPoint } from '../../src/index.js';
import { startEndData } from '../utils.js';

describe('rangesForPoint', () => {
    describe('document-start', () => {
        it('should create zero-length range at position 0', () => {
            const ranges = generateRanges('Hello world', rangesForPoint('document-start'));
            deepStrictEqual(startEndData(ranges), [[0, 0, null]]);
        });

        it('empty string', () => {
            const ranges = generateRanges('', rangesForPoint('document-start'));
            deepStrictEqual(startEndData(ranges), [[0, 0, null]]);
        });
    });

    describe('document-end', () => {
        it('should create zero-length range at end of content', () => {
            const ranges = generateRanges('Hello world', rangesForPoint('document-end'));
            deepStrictEqual(startEndData(ranges), [[11, 11, null]]);
        });

        it('empty string', () => {
            const ranges = generateRanges('', rangesForPoint('document-end'));
            deepStrictEqual(startEndData(ranges), [[0, 0, null]]);
        });

        it('content ending with newline', () => {
            const ranges = generateRanges('test\n', rangesForPoint('document-end'));
            deepStrictEqual(startEndData(ranges), [[5, 5, null]]);
        });
    });
});

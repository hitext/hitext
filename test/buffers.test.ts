import { strictEqual, deepStrictEqual } from 'assert';
import { parseHTML } from 'linkedom';
import { StringBuffer, ArrayBuffer, DOMBuffer } from '../src/index.js';

describe('Buffer implementations', () => {
    describe('StringBuffer', () => {
        it('should create an empty buffer', () => {
            const buffer = new StringBuffer();
            strictEqual(buffer.emit(), '');
        });

        it('should append strings', () => {
            const buffer = new StringBuffer();
            buffer.append('Hello');
            buffer.append(' ');
            buffer.append('World');
            strictEqual(buffer.emit(), 'Hello World');
        });

        it('should handle empty strings', () => {
            const buffer = new StringBuffer();
            buffer.append('');
            buffer.append('test');
            buffer.append('');
            strictEqual(buffer.emit(), 'test');
        });

        it('should handle special characters', () => {
            const buffer = new StringBuffer();
            buffer.append('Line 1\n');
            buffer.append('Tab\there');
            buffer.append('"quoted"');
            strictEqual(buffer.emit(), 'Line 1\nTab\there"quoted"');
        });

        it('should accumulate multiple appends', () => {
            const buffer = new StringBuffer();
            for (let i = 0; i < 5; i++) {
                buffer.append(i.toString());
            }
            strictEqual(buffer.emit(), '01234');
        });
    });

    describe('ArrayBuffer', () => {
        it('should create an empty buffer', () => {
            const buffer = new ArrayBuffer();
            deepStrictEqual(buffer.emit(), []);
        });

        it('should append strings', () => {
            const buffer = new ArrayBuffer();
            buffer.append('hello');
            buffer.append('world');
            deepStrictEqual(buffer.emit(), ['hello', 'world']);
        });

        it('should append typed values', () => {
            const buffer = new ArrayBuffer<number>();
            buffer.append(1);
            buffer.append('two');
            buffer.append(3);
            deepStrictEqual(buffer.emit(), [1, 'two', 3]);
        });

        it('should append nested arrays', () => {
            const buffer = new ArrayBuffer<number>();
            buffer.append(1);
            buffer.append(['nested', 'array']);
            buffer.append(2);
            deepStrictEqual(buffer.emit(), [1, ['nested', 'array'], 2]);
        });

        it('should handle deeply nested arrays', () => {
            const buffer = new ArrayBuffer<number>();
            buffer.append('start');
            buffer.append([1, [2, [3, ['deep']]]]);
            buffer.append('end');

            const result = buffer.emit();
            deepStrictEqual(result, ['start', [1, [2, [3, ['deep']]]], 'end']);
        });

        it('should support mixed types', () => {
            const buffer = new ArrayBuffer<{ id: number }>();
            buffer.append({ id: 1 });
            buffer.append('string');
            buffer.append([{ id: 2 }, 'nested']);

            const result = buffer.emit();
            deepStrictEqual(result, [
                { id: 1 },
                'string',
                [{ id: 2 }, 'nested']
            ]);
        });

        it('should handle empty arrays', () => {
            const buffer = new ArrayBuffer();
            buffer.append([]);
            buffer.append('test');
            deepStrictEqual(buffer.emit(), [[], 'test']);
        });

        it('should accumulate multiple appends', () => {
            const buffer = new ArrayBuffer<number>();
            for (let i = 0; i < 5; i++) {
                buffer.append(i);
            }
            deepStrictEqual(buffer.emit(), [0, 1, 2, 3, 4]);
        });
    });

    describe('DOMBuffer', () => {
        // Setup DOM environment for tests
        const { document } = parseHTML('<!DOCTYPE html><html></html>');

        it('should create an empty buffer', () => {
            const buffer = new DOMBuffer(document);
            const fragment = buffer.emit();
            strictEqual(fragment.childNodes.length, 0);
            strictEqual(fragment.toString(), '<#document-fragment></#document-fragment>');
        });

        it('should append text nodes', () => {
            const buffer = new DOMBuffer(document);
            buffer.append('Hello');
            buffer.append(' World');

            const fragment = buffer.emit();
            strictEqual(fragment.toString(), '<#document-fragment>Hello World</#document-fragment>');
        });

        it('should append DOM nodes', () => {
            const buffer = new DOMBuffer(document);
            const span = document.createElement('span');
            span.textContent = 'test';

            buffer.append(span);

            const fragment = buffer.emit();
            strictEqual(fragment.childNodes.length, 1);
            strictEqual(fragment.toString(), '<#document-fragment><span>test</span></#document-fragment>');
        });

        it('should handle mixed content', () => {
            const buffer = new DOMBuffer(document);
            const div = document.createElement('div');
            div.textContent = 'div content';

            buffer.append('text before ');
            buffer.append(div);
            buffer.append(' text after');

            const fragment = buffer.emit();
            strictEqual(fragment.toString(), '<#document-fragment>text before <div>div content</div> text after</#document-fragment>');
        });

        it('should preserve node structure', () => {
            const buffer = new DOMBuffer(document);
            const parent = document.createElement('div');
            const child = document.createElement('span');
            child.textContent = 'child';
            parent.appendChild(child);

            buffer.append(parent);

            const fragment = buffer.emit();
            const resultDiv = fragment.firstChild as globalThis.Element;
            strictEqual(resultDiv.tagName, 'DIV');
            strictEqual(resultDiv.firstChild?.textContent, 'child');
            strictEqual(fragment.toString(), '<#document-fragment><div><span>child</span></div></#document-fragment>');
        });

        it('should work with custom document', () => {
            const buffer = new DOMBuffer(document);
            buffer.append('custom');

            const fragment = buffer.emit();
            strictEqual(fragment.toString(), '<#document-fragment>custom</#document-fragment>');
        });

        it('should accumulate multiple appends', () => {
            const buffer = new DOMBuffer(document);
            for (let i = 0; i < 3; i++) {
                const span = document.createElement('span');
                span.textContent = `item${i}`;
                buffer.append(span);
            }

            const fragment = buffer.emit();
            strictEqual(fragment.childNodes.length, 3);
            strictEqual(fragment.toString(), '<#document-fragment><span>item0</span><span>item1</span><span>item2</span></#document-fragment>');
        });
    });

    describe('Buffer type compatibility', () => {
        it('StringBuffer should satisfy RenderBuffer<string, string>', () => {
            const buffer: { append(child: string): void; emit(): string } = new StringBuffer();
            buffer.append('test');
            strictEqual(buffer.emit(), 'test');
        });

        it('ArrayBuffer should satisfy RenderBuffer<T, R> interface', () => {
            type NestedArray = (number | string | NestedArray)[];
            const buffer: {
                append(child: number | string | NestedArray): void;
                emit(): NestedArray
            } = new ArrayBuffer<number>();

            buffer.append(1);
            buffer.append('test');
            const result = buffer.emit();
            deepStrictEqual(result, [1, 'test']);
        });

        it('buffers should be independently usable', () => {
            const str = new StringBuffer();
            const arr = new ArrayBuffer<number>();

            str.append('a');
            arr.append(1);
            str.append('b');
            arr.append(2);

            strictEqual(str.emit(), 'ab');
            deepStrictEqual(arr.emit(), [1, 2]);
        });
    });
});

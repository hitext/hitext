import { RenderBuffer } from '../types.js';

// Recursive type for nested arrays
type NestedArray<T> = (T | string | NestedArray<T | string>)[];

export class ArrayBuffer<T = unknown, R extends NestedArray<T> = NestedArray<T>> implements RenderBuffer<T, R> {
    #buffer: NestedArray<T> = [];
    append(child: T | R | string): void {
        this.#buffer.push(child);
    }
    emit(): R {
        return this.#buffer as R;
    }
}

export const createArrayBuffer = <T>() => new ArrayBuffer<T>();

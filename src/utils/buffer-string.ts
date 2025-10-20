import { RenderBuffer } from '../types.js';

export class StringBuffer implements RenderBuffer<string, string> {
    #buffer: string = '';
    append(child: string): void {
        this.#buffer += child;
    }
    emit(): string {
        return this.#buffer;
    }
}

export const createStringBuffer = () => new StringBuffer();

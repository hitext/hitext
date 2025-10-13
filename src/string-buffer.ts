export class StringBuffer {
    #buffer: string = '';
    append(child: string): void {
        this.#buffer += child;
    }
    emit(): string {
        return this.#buffer;
    }
}

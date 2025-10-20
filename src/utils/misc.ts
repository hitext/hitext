export const { defineProperties, entries, fromEntries } = Object;
export const createNoProtoObject = () => Object.create(null);
export const hasOwn = Object.hasOwn || ((o, v) => Object.hasOwnProperty.call(o, v));
export const { ownKeys } = Reflect;

export function functionOrValue<K, T>(value: K, fallback: T): (K extends Function ? K : T) {
    return typeof value === 'function' ? value as any : fallback as any;
}

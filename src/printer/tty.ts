import ansiStyles from 'ansi-styles';
import { createPrinter } from './utils.js';
import type { PrinterHookContext, PrinterHook } from '../types.d.js';

const initialStyle = createStyle('reset');
const createStyleFetcherUtils = {
    createStyleMap(map: StyleModMap, fetcher = ({ data }: { data: any }) => data) {
        const styleMap = createStyleMap(map);
        return (context: { data: any }) => styleMap[fetcher(context)];
    },
    createStyle(...styles: StyleMod[]) {
        const style = createStyle(...styles);
        return () => style;
    }
};

type ForegroundColorName = keyof ansiStyles.ForegroundColor;
type BackgroundColorName = keyof ansiStyles.BackgroundColor;
type StyleMod = ForegroundColorName | BackgroundColorName | 'reset';
type StyleModMap = { [key: string]: StyleMod | StyleMod[] };
type Style = {
    color?: string;
    bgColor?: string;
};

function isForegroundColor(name: StyleMod): name is ForegroundColorName {
    return name in ansiStyles.color;
}

function isBackgroundColor(name: StyleMod): name is BackgroundColorName {
    return name in ansiStyles.bgColor;
}

function createStyle(...style: StyleMod[]): Style {
    return style.reduce((result: Style, name) => {
        if (name === 'reset') {
            result.color = '\u001B[39m';
            result.bgColor = '\u001B[49m';
        } else if (isForegroundColor(name)) {
            result.color = ansiStyles.color[name].open;
        } else if (isBackgroundColor(name)) {
            result.bgColor = ansiStyles.bgColor[name].open;
        }

        return result;
    }, Object.create(null));
}

function createStyleMap(map: StyleModMap): { [key: string]: Style } {
    const result: { [key: string]: Style } = {};

    for (const key in map) {
        const value = map[key];
        result[key] = Array.isArray(value) ? createStyle(...value) : createStyle(value);
    }

    return result;
}

function styleToPrint(current: Style, next: Style = {}) {
    let modifiers = '';

    for (const key in current) {
        const styleKey = key as keyof Style;
        if (current[styleKey] !== next[styleKey]) {
            const nextValue = next[styleKey];
            if (nextValue) {
                modifiers += nextValue;
            }
        }
    }

    return modifiers;
}

interface TtyPrinterContext extends PrinterHookContext {
    pushStyle(style: Style): void;
    popStyle(): void;
    styleToPrint(): string;
};

export default createPrinter({
    createContext() {
        const stack: Style[] = [];
        let currentStyle: Style = initialStyle;
        let printedStyle = {};

        return {
            pushStyle(style: Style) {
                stack.push(currentStyle);
                currentStyle = Object.assign({}, currentStyle, style);
            },
            popStyle() {
                currentStyle = stack.pop() || currentStyle;
            },
            styleToPrint() {
                if (printedStyle !== currentStyle) {
                    const newStyle = styleToPrint(printedStyle, currentStyle);

                    printedStyle = currentStyle || {};

                    if (newStyle) {
                        return newStyle;
                    }
                }

                return '';
            }
        };
    },

    open(context: TtyPrinterContext) {
        return context.styleToPrint();
    },

    close(context: TtyPrinterContext) {
        return context.styleToPrint();
    },

    print(chunk: string, context: TtyPrinterContext) {
        return context.styleToPrint() + chunk;
    },

    createHook(createStyleFetcherFn): PrinterHook<TtyPrinterContext> {
        const styleFetcher = createStyleFetcherFn(createStyleFetcherUtils);

        return {
            open(context: TtyPrinterContext) {
                context.pushStyle(styleFetcher(context) || {});
                return '';
            },
            close(context: TtyPrinterContext) {
                context.popStyle();
                return '';
            }
        };
    }
});

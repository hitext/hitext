import ansiStyles from 'ansi-styles';
import { createPrinter } from './utils.js';
import type { PrinterHookContext } from '../types.d.js';

const initialStyle = createStyle('reset');
const createStyleFetcherUtils = {
    createStyleMap(map: StyleModMap, fetcher = ({ data }) => data) {
        const styleMap = createStyleMap(map);
        return (context: { data: any }) => styleMap[fetcher(context)];
    },
    createStyle(...styles: StyleMod[]) {
        const style = createStyle(...styles);
        return () => style;
    }
};

type StyleMod = keyof ansiStyles.ForegroundColor | keyof ansiStyles.BackgroundColor | 'reset';
type StyleModMap = { [key: string]: StyleMod | StyleMod[] };
type Style = {
    color?: string;
    bgColor?: string;
};

function createStyle(...style: StyleMod[]): Style {
    return style.reduce((result: Style, name) => {
        switch (true) {
            case name in ansiStyles.color:
                result.color = ansiStyles.color[name].open;
                break;

            case name in ansiStyles.bgColor:
                result.bgColor = ansiStyles.bgColor[name].open;
                break;

            case name === 'reset':
                result.color = '\u001B[39m';
                result.bgColor = '\u001B[49m';
                break;

            // default:
            //     console.error('Unknown modifier:', name);
        }

        return result;
    }, Object.create(null));
}

function createStyleMap(map: StyleModMap): { [key: string]: Style } {
    const result = {};

    for (const key in map) {
        const value = map[key];
        result[key] = Array.isArray(value) ? createStyle(...value) : createStyle(value);
    }

    return result;
}

function styleToPrint(current: Style, next: Style = {}) {
    let modifiers = '';

    for (const key in current) {
        if (current[key] !== next[key]) {
            switch (key) {
                case 'color':
                case 'bgColor':
                    modifiers += next[key] || '';
                    break;
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

    createHook(createStyleFetcherFn) {
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

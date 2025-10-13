import type { RangeHooks } from '../types.d.js';
import ansiStyles from 'ansi-styles';
import { createPipelineForPrinter } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

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
type StyleModMap = { [key: string]: StyleMod | StyleMod[] } | Array<StyleMod | StyleMod[]>;
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

    for (const [key, value] of Object.entries(map)) {
        result[key] = Array.isArray(value) ? createStyle(...value) : createStyle(value);
    }

    return result;
}

function _styleToPrint(current: Style, next: Style = {}) {
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

export function createTTYPrinter<LayerOptions>() {
    return createPipelineForPrinter<LayerOptions, string>(() => {
        const stack: Style[] = [];
        let currentStyle: Style = initialStyle;
        let printedStyle = {};

        return {
            createBuffer: () => new StringBuffer(),
            open: styleToPrint,
            close: styleToPrint,
            text: (chunk) => styleToPrint() + chunk,

            // Provide style utils to range hooks factories
            rangeHooksContext: {
                createStyle: wrap(createStyleFetcherUtils.createStyle),
                createStyleMap: wrap(createStyleFetcherUtils.createStyleMap),
                pushStyle,
                popStyle
            }
        };

        function pushStyle(style: Style) {
            stack.push(currentStyle);
            currentStyle = Object.assign({}, currentStyle, style);
        }
        function popStyle() {
            currentStyle = stack.pop() || currentStyle;
        }
        function styleToPrint() {
            if (printedStyle !== currentStyle) {
                const newStyle = _styleToPrint(printedStyle, currentStyle);

                printedStyle = currentStyle || {};

                if (newStyle) {
                    return newStyle;
                }
            }

            return '';
        }
        function wrap<T extends(...args: any[]) => any>(fn: T) {
            return (...args: Parameters<T>): Partial<RangeHooks<any, any>> => {
                const styleFetcher = fn(...args);

                return {
                    open(context) {
                        pushStyle(styleFetcher(context) || {});
                        return '';
                    },
                    close() {
                        popStyle();
                        return '';
                    }
                };
            };
        };
    });
}

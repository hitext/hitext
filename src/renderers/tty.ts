import type { RangeHookContext, RangeHooks, RangeHooksFactory } from '../types.js';
import { createRenderPipeline } from '../pipeline.js';
import { createStringBuffer } from '../utils/buffer-string.js';

type ForegroundColorName = keyof typeof styles.color;
type BackgroundColorName = keyof typeof styles.bgColor;
type StyleMod = ForegroundColorName | BackgroundColorName | 'reset';
type StyleModMap = { [key: string]: StyleMod | StyleMod[] } | Array<StyleMod | StyleMod[]>;
type Style = {
    color?: string;
    bgColor?: string;
};
type TtyFactoryContext = {
    createStyle: (...styles: StyleMod[]) => Partial<RangeHooks<any, any>>;
    createStyleMap: (map: StyleModMap, fetcher?: (context: RangeHookContext<any>) => any) => Partial<RangeHooks<any, any>>;
    pushStyle: (style: Style) => void;
    popStyle: () => void;
}

const initialStyle = /* @__PURE__ */ createStyle('reset');
const styles = {
    color: {
        black: 30,
        red: 31,
        green: 32,
        yellow: 33,
        blue: 34,
        magenta: 35,
        cyan: 36,
        white: 37,
        blackBright: 90,
        redBright: 91,
        greenBright: 92,
        yellowBright: 93,
        blueBright: 94,
        magentaBright: 95,
        cyanBright: 96,
        whiteBright: 97
    },
    bgColor: {
        bgBlack: 40,
        bgRed: 41,
        bgGreen: 42,
        bgYellow: 43,
        bgBlue: 44,
        bgMagenta: 45,
        bgCyan: 46,
        bgWhite: 47,
        bgBlackBright: 100,
        bgRedBright: 101,
        bgGreenBright: 102,
        bgYellowBright: 103,
        bgBlueBright: 104,
        bgMagentaBright: 105,
        bgCyanBright: 106,
        bgWhiteBright: 107
    }
};

function createStyle(...style: StyleMod[]): Style {
    return style.reduce((result: Style, name) => {
        if (name === 'reset') {
            result.color = '\u001B[39m';
            result.bgColor = '\u001B[49m';
        } else if (Object.hasOwn(styles.color, name)) {
            result.color = `\u001B[${styles.color[name as ForegroundColorName]}m`;
        } else if (Object.hasOwn(styles.bgColor, name)) {
            result.bgColor = `\u001B[${styles.bgColor[name as BackgroundColorName]}m`;
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

function rangeHooksFactoryCreateStyle(...styles: StyleMod[]) {
    const style = createStyle(...styles);
    return () => style;
}

function rangeHooksFactoryCreateStyleMap(
    map: StyleModMap,
    fetcher = ({ data, rangeText }: RangeHookContext<any>) =>
        Array.isArray(data) ? data[0] : data ?? rangeText
) {
    const styleMap = createStyleMap(map);
    return (context: RangeHookContext<any>) => styleMap[fetcher(context)];
}

export const createTTYRenderer = /* @__PURE__ */ Object.assign(
    function createTTYRenderer<RenderOptions>() {
        return createRenderPipeline<RenderOptions, string, string, TtyFactoryContext>(() => {
            const stack: Style[] = [];
            let currentStyle: Style = initialStyle;
            let renderedStyle: Style = {};

            return {
                createBuffer: createStringBuffer,
                open: styleToRender,
                close: styleToRender,
                text: (sourceChunk) => styleToRender() + sourceChunk,

                // Provide style utils to range hooks factories
                rangeHooksContext: {
                    createStyle: rangeHooksFactory(rangeHooksFactoryCreateStyle),
                    createStyleMap: rangeHooksFactory(rangeHooksFactoryCreateStyleMap),
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
            function styleToRender() {
                if (renderedStyle !== currentStyle) {
                    let newStyle = '';

                    for (const key in renderedStyle) {
                        const styleKey = key as keyof Style;
                        if (renderedStyle[styleKey] !== currentStyle[styleKey]) {
                            const nextValue = currentStyle[styleKey];
                            if (nextValue) {
                                newStyle += nextValue;
                            }
                        }
                    }

                    renderedStyle = currentStyle || {};

                    if (newStyle !== '') {
                        return newStyle;
                    }
                }

                return '';
            }
            function rangeHooksFactory<T extends(...args: any[]) => any>(fn: T) {
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
    },
    // Attach helper functions as static methods to the factory function itself
    {
        createStyle: (
            ...args: Parameters<TtyFactoryContext['createStyle']>
        ): RangeHooksFactory<any, any, any, TtyFactoryContext> => ({
            createRangeHooks: ({ createStyle }) => createStyle(...args)
        }),

        createStyleMap: (
            ...args: Parameters<TtyFactoryContext['createStyleMap']>
        ): RangeHooksFactory<any, any, any, TtyFactoryContext> => ({
            createRangeHooks: ({ createStyleMap }) => createStyleMap(...args)
        })
    }
);

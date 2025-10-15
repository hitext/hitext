import type { RangeHookContext, RangeHooks, RangeHooksFactory } from '../types.js';
import ansiStyles from 'ansi-styles';
import { createRenderPipeline } from '../pipeline.js';
import { StringBuffer } from '../string-buffer.js';

const initialStyle = createStyle('reset');

type ForegroundColorName = keyof ansiStyles.ForegroundColor;
type BackgroundColorName = keyof ansiStyles.BackgroundColor;
type StyleMod = ForegroundColorName | BackgroundColorName | 'reset';
type StyleModMap = { [key: string]: StyleMod | StyleMod[] } | Array<StyleMod | StyleMod[]>;
type Style = {
    color?: string;
    bgColor?: string;
};
type RangeHooksFactoryContext = {
    createStyle: (...styles: StyleMod[]) => Partial<RangeHooks<any, any>>;
    createStyleMap: (map: StyleModMap, fetcher?: (context: RangeHookContext<any>) => any) => Partial<RangeHooks<any, any>>;
    pushStyle: (style: Style) => void;
    popStyle: () => void;
}

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

function rangeHooksFactoryCreateStyle(...styles: StyleMod[]) {
    const style = createStyle(...styles);
    return () => style;
}

function rangeHooksFactoryCreateStyleMap(map: StyleModMap, fetcher = ({ data }: RangeHookContext<any>) => data) {
    const styleMap = createStyleMap(map);
    return (context: RangeHookContext<any>) => styleMap[fetcher(context)];
}

function _styleToRender(current: Style, next: Style = {}) {
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

export function createTTYRenderer<RenderOptions>() {
    return createRenderPipeline<RenderOptions, string, string, RangeHooksFactoryContext>(() => {
        const stack: Style[] = [];
        let currentStyle: Style = initialStyle;
        let renderedStyle = {};

        return {
            createBuffer: () => new StringBuffer(),
            open: styleToRender,
            close: styleToRender,
            text: (sourceChunk) => styleToRender() + sourceChunk,

            // Provide style utils to range hooks factories
            rangeHooksContext: {
                createStyle: wrapToContext(rangeHooksFactoryCreateStyle),
                createStyleMap: wrapToContext(rangeHooksFactoryCreateStyleMap),
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
                const newStyle = _styleToRender(renderedStyle, currentStyle);

                renderedStyle = currentStyle || {};

                if (newStyle) {
                    return newStyle;
                }
            }

            return '';
        }
        function wrapToContext<T extends(...args: any[]) => any>(fn: T) {
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

// Attach helper functions as static methods to the factory function itself
createTTYRenderer.createStyle = (
    ...args: Parameters<RangeHooksFactoryContext['createStyle']>
): RangeHooksFactory<any, any, any, RangeHooksFactoryContext> => ({
    createRangeHooks: ({ createStyle }) => createStyle(...args)
});

createTTYRenderer.createStyleMap = (
    ...args: Parameters<RangeHooksFactoryContext['createStyleMap']>
): RangeHooksFactory<any, any, any, RangeHooksFactoryContext> => ({
    createRangeHooks: ({ createStyleMap }) => createStyleMap(...args)
});

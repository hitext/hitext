const styles = require('ansi-styles');
const { createPrinter } = require('./utils');
const initialStyle = createStyle('reset');
const createStyleFetcherUtils = {
    createStyleMap: (map, fetcher = ({ data }) => data) => {
        const styleMap = createStyleMap(map);
        return (...args) => styleMap[fetcher(...args)];
    },
    createStyle: (...styles) => {
        const style = createStyle(...styles);
        return () => style;
    }
};

function createStyle(...style) {
    return style.reduce((result, name) => {
        switch (true) {
            case name in styles.color:
                result.color = styles.color[name].open;
                break;

            case name in styles.bgColor:
                result.bgColor = styles.bgColor[name].open;
                break;

            case name === 'reset':
                result.color = '\u001B[39m';
                result.bgColor = '\u001B[49m';
                break;

            // default:
            //     console.error('Unknown modifier:', name);
        }

        return result;
    }, {});
}

function createStyleMap(map) {
    const result = {};

    for (let key in map) {
        result[key] = Array.isArray(map[key]) ? createStyle(...map[key]) : createStyle(map[key]);
    }

    return result;
}

function createHook(createStyleFetcherFn) {
    const styleFetcher = createStyleFetcherFn(createStyleFetcherUtils);

    return {
        open: (context) => {
            context.pushStyle(styleFetcher(context) || {});
        },
        close: (context) => {
            context.popStyle();
        }
    };
}

function styleToPrint(current, next) {
    let modifiers = '';

    for (let key in current) {
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

module.exports = createPrinter({
    createContext() {
        const stack = [];
        let currentStyle = initialStyle;
        let printedStyle = {};

        return {
            pushStyle(style) {
                stack.push(currentStyle);
                currentStyle = Object.assign({}, currentStyle, style);
            },
            popStyle() {
                currentStyle = stack.pop();
            },
            styleToPrint() {
                if (printedStyle !== currentStyle) {
                    const newStyle = styleToPrint(printedStyle, currentStyle);

                    printedStyle = currentStyle;

                    if (newStyle) {
                        return newStyle;
                    }
                }

                return '';
            }
        };
    },

    open(context) {
        return context.styleToPrint();
    },

    close(context) {
        return context.styleToPrint();
    },

    print(chunk, context) {
        return context.styleToPrint() + chunk;
    },

    createHook
});

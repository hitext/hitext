const styles = require('ansi-styles');
const { createPrinter } = require('./utils');
const initialStyle = createStyle('reset');
const createStyleFetcherUtils = {
    createStyleMap: (map, fetcher = data => data) => {
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
        open: (data, context) => {
            const style = styleFetcher(data) || {};

            context.stack.push(context.style);
            context.style = Object.assign({}, context.style, style);
            // console.log('!o', context.style);
        },
        close: (data, context) => {
            context.style = context.stack.pop();
            // console.log('!c', context.style);
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
        return {
            printed: initialStyle,
            style: initialStyle,
            stack: []
        };
    },

    open(context) {
        return styleToPrint({}, context.printed);
    },

    close(context) {
        return styleToPrint(context.printed, context.style);
    },

    print(chunk, context) {
        // console.log('>>', chunk);
        if (context.printed !== context.style) {
            const newStyle = styleToPrint(context.printed, context.style);

            context.printed = context.style;

            if (newStyle) {
                return newStyle + chunk;
            }
        }

        return chunk;
    },

    createHook
});

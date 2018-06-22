const acorn = require('acorn-jsx');
const walk = require('./acorn-jsx-walker')(require('acorn/dist/walk'));

/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
module.exports = {
    name: 'Token',
    genRanges: (source, addRange) => {
        const parser = new acorn.Parser({
            ranges: true,
            plugins: { jsx: true },
            allowReturnOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            onComment: (isBlock, value, start, end) =>
                addRange(
                    start,
                    end,
                    'comment'
                ),
            onToken: function(token) {
                let type = null;

                switch (parser.curContext()) {
                    case acorn.tokContexts.j_oTag:
                    case acorn.tokContexts.j_cTag:
                        switch (token.type) {
                            case acorn.tokTypes.jsxTagStart:
                            case acorn.tokTypes.jsxTagEnd:
                            case acorn.tokTypes.braceR:
                            case acorn.tokTypes.eq:
                            case acorn.tokTypes.slash:
                                type = 'punctuator';
                                break;
                        }
                        break;

                    default:
                        switch (token.type) {
                            case acorn.tokTypes.num:
                            case acorn.tokTypes.regexp:
                            case acorn.tokTypes.template:
                            case acorn.tokTypes.invalidTemplate:
                                type = token.type.label;
                                break;

                            case acorn.tokTypes.name:
                                type = token.type.label;
                                if (token.value === 'from') {
                                    type = 'keyword';
                                }
                                break;

                            case acorn.tokTypes.string:
                                type = 'string';
                                break;

                            case acorn.tokTypes.bracketL:
                            case acorn.tokTypes.bracketR:
                            case acorn.tokTypes.braceL:
                            case acorn.tokTypes.braceR:
                            case acorn.tokTypes.parenL:
                            case acorn.tokTypes.parenR:
                            case acorn.tokTypes.comma:
                            case acorn.tokTypes.semi:
                            case acorn.tokTypes.colon:
                            case acorn.tokTypes.dot:
                            case acorn.tokTypes.question:
                            case acorn.tokTypes.arrow:
                            case acorn.tokTypes.ellipsis:
                            case acorn.tokTypes.backQuote:
                            case acorn.tokTypes.dollarBraceL:
                                type = 'punctuator';
                                break;

                            case acorn.tokTypes.eq:
                            case acorn.tokTypes.assign:
                            case acorn.tokTypes.incDec:
                            case acorn.tokTypes.prefix:
                            case acorn.tokTypes.logicalOR:
                            case acorn.tokTypes.logicalAND:
                            case acorn.tokTypes.bitwiseOR:
                            case acorn.tokTypes.bitwiseXOR:
                            case acorn.tokTypes.bitwiseAND:
                            case acorn.tokTypes.equality:
                            case acorn.tokTypes.relational:
                            case acorn.tokTypes.bitShift:
                            case acorn.tokTypes.plusMin:
                            case acorn.tokTypes.modulo:
                            case acorn.tokTypes.star:
                            case acorn.tokTypes.slash:
                            case acorn.tokTypes.starstar:
                                type = 'operator';
                                break;

                            case acorn.keywordTypes.true:
                            case acorn.keywordTypes.false:
                            case acorn.keywordTypes.null:
                            case acorn.keywordTypes.undefined:
                                type = 'value-keyword';
                                break;

                            default:
                                if (token.type.keyword) {
                                    type = 'keyword';
                                    break;
                                }

                                // console.log('Unknown type', token);
                        }
                }

                if (type) {
                    addRange(
                        token.start,
                        token.end,
                        type
                    );
                }
            }
        }, source);

        let ast = null;

        try {
            ast = parser.parse();
        } catch (e) {
            return;
        }

        walk.simple(ast, {
            JSXOpeningElement(node) {
                addRange(
                    node.name.range[0],
                    node.name.range[1],
                    'jsx-open-tag'
                );
                addRange(
                    node.range[1] - 1,
                    node.range[1],
                    'punctuator'
                );
            },
            JSXClosingElement(node) {
                addRange(
                    node.name.range[0],
                    node.name.range[1],
                    'jsx-close-tag'
                );
                addRange(
                    node.range[1] - 1,
                    node.range[1],
                    'punctuator'
                );
            },
            JSXOpeningFragment(node) {
                addRange(
                    node.range[1] - 1,
                    node.range[1],
                    'punctuator'
                );
            },
            JSXClosingFragment(node) {
                addRange(
                    node.range[1] - 1,
                    node.range[1],
                    'punctuator'
                );
            },
            JSXAttribute(node) {
                addRange(
                    node.name.range[0],
                    node.name.range[1],
                    'jsx-attr-name'
                );

                if (node.value && node.value.type === 'Literal') {
                    addRange(node.value.range[0], node.value.range[0] + 1, 'punctuator');
                    addRange(node.value.range[1] - 1, node.value.range[1], 'punctuator');
                    addRange(node.value.range[0] + 1, node.value.range[1] - 1, 'attr-value');
                }
            }
        });
    },
    print: {
        html: {
            style: [
                '.token.keyword,.token.attr-value{color:#07a}',
                '.token.string{color:#690;word-break:break-all}',
                '.token.punctuator{color:#999}',
                '.token.num,.token.value-keyword,.token.jsx-open-tag,.token.jsx-close-tag{color:#905}',
                '.token.jsx-attr-name{color:#690}',
                '.token.regexp{color:#e90}',
                '.token.comment{color:slategray}'
            ].join('\n'),
            open: (data) => {
                return '<span class="token ' + data + '">';
            },
            close: () => {
                return '</span>';
            }
        }
    }
};

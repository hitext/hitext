const acorn = require('acorn-jsx');

/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
module.exports = ({ ast, tokens, comments, addRange, walk }) => {
    comments.forEach(token =>
        addRange('syntax', token.start, token.end, 'comment')
    );

    tokens.forEach(({ token, context }) => {
        let type = null;

        switch (context) {
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
                        type = 'number';
                        break;

                    case acorn.tokTypes.regexp:
                        type = 'regexp';
                        break;

                    case acorn.tokTypes.template:
                    case acorn.tokTypes.invalidTemplate:
                        type = 'template';
                        break;

                    case acorn.tokTypes.name:
                        type = 'name';
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
            addRange('syntax', token.start, token.end, type);
        }
    });

    walk.simple(ast, {
        JSXOpeningElement(node) {
            addRange('syntax', node.name.range[0], node.name.range[1], 'tag');
            addRange('syntax', node.range[1] - 1, node.range[1], 'punctuator');
        },
        JSXClosingElement(node) {
            addRange('syntax', node.name.range[0], node.name.range[1], 'tag');
            addRange('syntax', node.range[1] - 1, node.range[1], 'punctuator');
        },
        JSXOpeningFragment(node) {
            addRange('syntax', node.range[1] - 1, node.range[1], 'punctuator');
        },
        JSXClosingFragment(node) {
            addRange('syntax', node.range[1] - 1, node.range[1], 'punctuator');
        },
        JSXAttribute(node) {
            addRange('syntax', node.name.range[0], node.name.range[1], 'attr-name');

            if (node.value && node.value.type === 'Literal') {
                addRange('syntax', node.value.range[0], node.value.range[0] + 1, 'punctuator');
                addRange('syntax', node.value.range[1] - 1, node.value.range[1], 'punctuator');
                addRange('syntax', node.value.range[0] + 1, node.value.range[1] - 1, 'attr-value');
            }
        }
    });
};

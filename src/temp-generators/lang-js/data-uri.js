const acorn = require('acorn-jsx');

module.exports = ({ tokens, addRange }) =>
    tokens.forEach(token => {
        if (token.type !== acorn.tokTypes.string) {
            return;
        }

        const dataURI = token.value.match(/^(data:\S+?;base64,)[a-z0-9+\/]{20,}=*$/i);

        if (dataURI) {
            addRange(
                'shortener',
                token.start + dataURI[1].length + 1,
                token.end - 1,
                token.end - token.start - dataURI[1].length - 2
            );
        }
    });

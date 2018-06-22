const acorn = require('acorn-jsx');

module.exports = {
    genRanges: (source, addRange) =>
        acorn.parse(source, {
            ranges: true,
            plugins: { jsx: true },
            allowReturnOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            onToken: token => {
                if (token.type !== acorn.tokTypes.string) {
                    return;
                }

                const dataURI = token.value.match(/^(data:\S+?;base64,)[a-z0-9+\/]{20,}=*$/i);

                if (dataURI) {
                    addRange(
                        token.start + dataURI[1].length + 1,
                        token.end - 1,
                        token.end - token.start - dataURI[1].length - 2
                    );
                }
            }
        }),
    print: {
        html: {
            style: [
                '.data-uri .payload{display:none}',
                '.data-uri::before{content: "...(" attr(data-length) " chars)..."}'
            ].join('\n'),
            open: (len) => {
                return `<span class="data-uri" data-length="${len}"><span class="payload">`;
            },
            close: () => {
                return '</span></span>';
            }
        }
    }
};

module.exports = function generateRanges(source, generators) {
    const ranges = [];

    generators.forEach(({ generate, marker }) =>
        generate(
            source,
            (start, end, data) => ranges.push({ type: marker, start, end, data })
        )
    );

    return ranges;
};

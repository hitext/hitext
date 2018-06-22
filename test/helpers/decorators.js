const stubDecoratorFactory = ranges => ({
    genRanges(source, addRange) {
        ranges.forEach(range => addRange(...range));
    }
});

module.exports = {
    stub: stubDecoratorFactory
};

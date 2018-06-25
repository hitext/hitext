const stubGeneratorFactory =
    ranges => (source, addRange) =>
        ranges.forEach(range => addRange(...range));

module.exports = {
    stub: stubGeneratorFactory
};

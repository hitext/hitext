const stubGeneratorFactory =
    ranges => (source, createRange) =>
        ranges.forEach(range => createRange(...range));

module.exports = {
    stub: stubGeneratorFactory
};

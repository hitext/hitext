module.exports =
    (...ranges) =>
        (source, addRange) =>
            ranges.forEach(range => addRange('spotlight', ...range));

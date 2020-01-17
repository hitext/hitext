module.exports = function generateRanges(source, generators, printerType) {
    const ranges = [];
    const priority = [];

    generators.forEach(({ generate, printer: printers }) => {
        const printer = printers[printerType];

        if (printer) {
            priority.push(printer);
            generate(
                source,
                (start, end, data) => ranges.push({
                    printer,
                    start,
                    end,
                    data
                })
            );
        }
    });

    // sort ranges
    ranges.sort(
        (a, b) =>
            a.start - b.start ||
            b.end - a.end ||
            priority.indexOf(a.printer) - priority.indexOf(b.printer)
    );

    return ranges;
};

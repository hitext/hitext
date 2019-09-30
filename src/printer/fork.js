module.exports = function(extension = {}) {
    return Object.assign({}, this, extension, {
        ranges: Object.assign({}, this.ranges, extension.ranges)
    });
};

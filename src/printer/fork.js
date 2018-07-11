module.exports = function(extension = {}) {
    return Object.assign({}, this, extension, {
        hooks: Object.assign({}, this.hooks, extension.hooks)
    });
};

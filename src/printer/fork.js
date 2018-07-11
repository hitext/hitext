module.exports = function(extension = {}) {
    return {
        ...this,
        ...extension,
        hooks: {
            ...this.hooks,
            ...extension.hooks
        }
    };
};

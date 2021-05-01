"use strict";

const { exec } = require("@actions/exec");

// call effect
function transformListeners(listeners) {
    const newListeners = {};
    if (listeners.stdout) {
        newListeners.stdout = function(b) { listeners.stdout(b)(); };
    }

    return newListeners;
}
function transformOptions(opts) {
    const newOptions = Object.assign({}, opts);
    if (newOptions.listeners) {
        newOptions.listeners = transformListeners(newOptions.listeners);
    }

    return newOptions;
}

exports.execNative = function(command) {
    return function(args) {
        return function(options) {
            return function(failureCallback) {
                return function(successCallback) {
                    return function() {
                        exec(command, args, transformOptions(options)).then(
                            s => successCallback(s)(), e => failureCallback(e)()
                        );
                    };
                };
            };
        };
    };
};

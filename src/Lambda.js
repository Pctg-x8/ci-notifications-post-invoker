"use strict";

const Lambda = require("aws-sdk/clients/lambda");

exports.invokeEventNative = function(name) {
    return function(payload) {
        return function(failureCallback) {
            return function(successCallback) {
                return function() {
                    var service = new Lambda({ region: process.env.AWS_DEFAULT_REGION });
                    var invokeParams = {
                        FunctionName: name,
                        Payload: payload,
                        InvocationType: "Event"
                    };

                    service.invoke(invokeParams, function(e, data) {
                        if (e) {
                            failureCallback(e)();
                        } else {
                            successCallback(data)();
                        }
                    });
                };
            };
        };
    };
};

exports.awsErrorMessage = function(e) { return e.message; };

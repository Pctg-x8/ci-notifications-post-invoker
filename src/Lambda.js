"use strict";

const { Lambda } = require("@aws-sdk/client-lambda");
const CredentialProviders = require("@aws-sdk/credential-providers");

exports.invokeEventNative = function(name) {
    return function(payload) {
        return function(failureCallback) {
            return function(successCallback) {
                return function() {
                    var service = new Lambda({
                        credentials: CredentialProviders.fromTokenFile()
                    });
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

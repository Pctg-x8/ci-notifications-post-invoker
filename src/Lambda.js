"use strict";

const { Lambda } = require("@aws-sdk/client-lambda");
const { fromTokenFile } = require("@aws-sdk/credential-providers");

exports.invokeEventNative = function(name) {
    return function(payload) {
        return function(failureCallback) {
            return function(successCallback) {
                return function() {
                    var credentials = fromTokenFile();
                    credentials().then(c => console.log(c.accessKeyId));
                    var service = new Lambda({
                        region: process.env.AWS_DEFAULT_REGION,
                        credentials
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

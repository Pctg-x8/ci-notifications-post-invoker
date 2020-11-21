"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var core = require("@actions/core");
var exec_1 = require("@actions/exec");
var github = require("@actions/github");
var Lambda = require("aws-sdk/clients/lambda");
var fs = require("fs");
var path = require("path");
function getCommitInfo(head) {
    return __awaiter(this, void 0, void 0, function () {
        var outputStrings, exitCode, _a, committerName, commitMessage;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    outputStrings = "";
                    return [4 /*yield*/, exec_1.exec("git", ["log", "--format=%cn%x09%B", "-n", "1", head], {
                            listeners: {
                                stdout: function (data) {
                                    outputStrings += data.toString();
                                }
                            }
                        })];
                case 1:
                    exitCode = _b.sent();
                    if (exitCode != 0)
                        throw new Error("git log exited with code " + exitCode);
                    _a = outputStrings.trimEnd().split("\t", 2), committerName = _a[0], commitMessage = _a[1];
                    return [2 /*return*/, {
                            committer: committerName,
                            message: commitMessage,
                            sha: head
                        }];
            }
        });
    });
}
var endTime = Math.floor((new Date()).getTime() / 1000);
var input = {
    beginTime: Number(core.getInput("begintime")),
    status: core.getInput("status"),
    headSha: core.getInput("head_sha", { required: false }),
    baseSha: core.getInput("base_sha", { required: false }),
    reportName: core.getInput("report_name"),
    mode: core.getInput("mode")
};
var _a = github.context.repo, repoOwner = _a.owner, repoName = _a.repo;
var rawbuildlogPath = path.join(process.env["GITHUB_WORKSPACE"], ".rawbuildlog");
var buildlogPath = path.join(process.env["GITHUB_WORKSPACE"], ".buildlog");
var rawbuildlogLoader = new Promise(function (resv, rej) {
    fs.readFile(rawbuildlogPath, "utf-8", function (e, s) {
        if (e)
            if (e.code === "ENOENT")
                resv(null);
            else
                rej(e);
        else
            resv(s);
    });
});
var buildlogLoader = new Promise(function (resv, rej) {
    fs.readFile(buildlogPath, "utf-8", function (e, s) {
        if (e)
            if (e.code === "ENOENT")
                resv(null);
            else
                rej(e);
        else
            resv(s);
    });
});
var BUILDLOG_MAX_AVAILABLE_LINES = 10;
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, buildlog, rawbuildlog, supportInfo, buildlogLines, commonPayload, payload;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([buildlogLoader, rawbuildlogLoader])];
                case 1:
                    _a = _b.sent(), buildlog = _a[0], rawbuildlog = _a[1];
                    supportInfo = "";
                    if (rawbuildlog !== null)
                        supportInfo += rawbuildlog;
                    if (buildlog !== null) {
                        if (supportInfo.charAt(supportInfo.length - 1) !== '\n')
                            supportInfo += "\n";
                        buildlogLines = buildlog.split("\n").filter(function (x) { return x !== ""; });
                        if (buildlogLines.length > BUILDLOG_MAX_AVAILABLE_LINES) {
                            // omitted
                            supportInfo += "```\n...\n" + buildlogLines.slice(buildlogLines.length - BUILDLOG_MAX_AVAILABLE_LINES).join("\n") + "\n```";
                        }
                        else {
                            supportInfo += "```\n" + buildlogLines.join("\n") + "\n```";
                        }
                    }
                    commonPayload = {
                        status: input.status,
                        failure_step: input.status == "failure" ? core.getInput("failure_step") : undefined,
                        build_url: "https://github.com/" + repoOwner + "/" + repoName + "/actions/runs/" + github.context.runId,
                        number: github.context.runNumber,
                        duration: endTime - input.beginTime,
                        repository: [repoOwner, repoName].join("/"),
                        report_name: input.reportName,
                        support_info: supportInfo !== "" ? supportInfo : undefined
                    };
                    if (!(input.mode == "diff")) return [3 /*break*/, 3];
                    return [4 /*yield*/, getCommitInfo(input.headSha).then(function (cinfo) { return (__assign({ compare_url: "https://github.com/" + repoOwner + "/" + repoName + "/compare/" + input.baseSha + ".." + input.headSha, commit_hash: input.headSha, ref: process.env.GITHUB_HEAD_REF, pr_number: Number(core.getInput("pr_number")), pr_name: core.getInput("pr_title"), commit: cinfo }, commonPayload)); })];
                case 2:
                    payload = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, getCommitInfo(github.context.sha).then(function (cinfo) { return (__assign({ branch_name: github.context.ref.replace(/^refs\/heads\//, ""), commit: cinfo }, commonPayload)); })];
                case 4:
                    payload = _b.sent();
                    _b.label = 5;
                case 5:
                    new Lambda({ region: process.env.AWS_DEFAULT_REGION }).invoke({
                        FunctionName: "CIResultNotificationGHA",
                        Payload: JSON.stringify(payload),
                        InvocationType: "Event"
                    }, function (e, data) {
                        if (e)
                            console.error("Invocation Failed!", e, e.stack);
                        else
                            console.log("Invocation OK", data);
                    });
                    return [2 /*return*/];
            }
        });
    });
}
run();

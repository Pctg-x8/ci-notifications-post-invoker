"use strict";

const github = require("@actions/github");

exports.repoOwner = github.context.repo.owner;
exports.repoName = github.context.repo.repo;
exports.runId = github.context.runId;
exports.runNumber = github.context.runNumber;
exports.sha = github.context.sha;
exports.ref = github.context.ref;

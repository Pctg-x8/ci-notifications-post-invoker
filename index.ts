import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";
import * as Lambda from "aws-sdk/clients/lambda";
import * as fs from "fs";
import * as path from "path";

type CommitInfo = {
    readonly committer: string;
    readonly message: string;
    readonly sha: string;
};
async function getCommitInfo(head: string): Promise<CommitInfo> {
    let outputStrings = "";
    const exitCode = await exec("git", ["log", "--format=%cn%x09%B", "-n", "1", head], {
        listeners: {
            stdout: (data: Buffer) => {
                outputStrings += data.toString();
            }
        }
    });
    if (exitCode != 0) throw new Error(`git log exited with code ${exitCode}`);
    const [committerName, commitMessage] = outputStrings.trimEnd().split("\t", 2);
    
    return {
        committer: committerName,
        message: commitMessage,
        sha: head
    };
}

const endTime = Math.floor((new Date()).getTime() / 1000);

const input = {
    beginTime: Number(core.getInput("begintime")),
    status: core.getInput("status"),
    headSha: core.getInput("head_sha", { required: false }),
    baseSha: core.getInput("base_sha", { required: false }),
    reportName: core.getInput("report_name"),
    mode: core.getInput("mode")
};
const { owner: repoOwner, repo: repoName } = github.context.repo;
const rawbuildlogPath = path.join(process.env["GITHUB_WORKSPACE"], ".rawbuildlog");
const buildlogPath = path.join(process.env["GITHUB_WORKSPACE"], ".buildlog");
const rawbuildlogLoader: Promise<string | null> = new Promise((resv, rej) => {
    fs.readFile(rawbuildlogPath, "utf-8", (e, s) => {
        if (e) if (e.code === "ENOENT") resv(null); else rej(e);
        else resv(s);
    });
});
const buildlogLoader: Promise<string | null> = new Promise((resv, rej) => {
    fs.readFile(buildlogPath, "utf-8", (e, s) => {
        if (e) if (e.code === "ENOENT") resv(null); else rej(e);
        else resv(s);
    });
});

type LambdaPayloadCommon = {
    readonly status: string;
    readonly failure_step?: string;
    readonly build_url: string;
    readonly number: number;
    readonly duration: number;
    readonly repository: string;
    readonly commit: CommitInfo;
    readonly report_name: string;
    readonly support_info?: string;
};
type LambdaPayloadDiff = {
    readonly compare_url: string;
    readonly commit_hash: string;
    readonly ref: string;
    readonly pr_number: number;
    readonly pr_name: string;
} & LambdaPayloadCommon;
type LambdaPayloadBranch = {
    readonly branch_name: string;
} & LambdaPayloadCommon;
type LambdaPayload = LambdaPayloadDiff | LambdaPayloadBranch;

const BUILDLOG_MAX_AVAILABLE_LINES = 15;

async function run() {
    const [buildlog, rawbuildlog] = await Promise.all([buildlogLoader, rawbuildlogLoader]);
    let supportInfo = "";
    if (rawbuildlog !== null) supportInfo += rawbuildlog;
    if (buildlog !== null) {
        if (supportInfo.charAt(supportInfo.length - 1) !== '\n') supportInfo += "\n";
        const buildlogLines = buildlog.split("\n");
        if (buildlogLines[buildlogLines.length - 1] === "") buildlogLines.pop();
        const omitted = buildlogLines.length > BUILDLOG_MAX_AVAILABLE_LINES;
        let targetLines = buildlogLines.slice(Math.max(buildlogLines.length - BUILDLOG_MAX_AVAILABLE_LINES, 0))
            .map(l => l.replace(/\r$/, ""));
        if (omitted) targetLines = ["...", ...targetLines];

        supportInfo += "```\n" + targetLines.join("\n") + "\n```";
    }

    const commonPayload: Omit<LambdaPayloadCommon, "commit"> = {
        status: input.status,
        failure_step: input.status == "failure" ? core.getInput("failure_step") : undefined,
        build_url: `https://github.com/${repoOwner}/${repoName}/actions/runs/${github.context.runId}`,
        number: github.context.runNumber,
        duration: endTime - input.beginTime,
        repository: [repoOwner, repoName].join("/"),
        report_name: input.reportName,
        support_info: supportInfo !== "" ? supportInfo : undefined
    };

    let payload: LambdaPayload;
    if (input.mode == "diff") {
        payload = await getCommitInfo(input.headSha).then<LambdaPayloadDiff>(cinfo => ({
            compare_url: `https://github.com/${repoOwner}/${repoName}/compare/${input.baseSha}..${input.headSha}`,
            commit_hash: input.headSha,
            ref: process.env.GITHUB_HEAD_REF,
            pr_number: Number(core.getInput("pr_number")),
            pr_name: core.getInput("pr_title"),
            commit: cinfo,
            ... commonPayload
        }));
    } else {
        payload = await getCommitInfo(github.context.sha).then<LambdaPayloadBranch>(cinfo => ({
            branch_name: github.context.ref.replace(/^refs\/heads\//, ""),
            commit: cinfo,
            ... commonPayload
        }));
    }

    new Lambda({ region: process.env.AWS_DEFAULT_REGION }).invoke({
        FunctionName: "CIResultNotificationGHA",
        Payload: JSON.stringify(payload),
        InvocationType: "Event"
    }, (e, data) => {
        if (e) console.error("Invocation Failed!", e, e.stack);
        else console.log("Invocation OK", data);
    });
}

run();

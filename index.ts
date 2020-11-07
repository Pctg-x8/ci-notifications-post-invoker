import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";
import * as Lambda from "aws-sdk/clients/lambda";

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
    const [committerName, commitMessage] = outputStrings.split("\t", 2);
    
    return {
        committer: committerName,
        message: commitMessage,
        sha: head
    };
}

const endTime = Math.floor((new Date()).getTime() / 1000);

const beginTime = Number(core.getInput("begintime"));
const status = core.getInput("status");
const inputHeadSha = core.getInput("head_sha");
const inputBaseSha = core.getInput("base_sha");
const { owner: repoOwner, repo: repoName } = github.context.repo;

type LambdaPayload = {
    readonly status: string;
    readonly failure_step?: string;
    readonly build_url: string;
    readonly number: number;
    readonly duration: number;
    readonly compare_url: string;
    readonly commit_hash: string;
    readonly repository: string;
    readonly ref: string;
    readonly pr_number: number;
    readonly pr_name: string;
    readonly commit: CommitInfo;
};

getCommitInfo(inputHeadSha).then(cinfo => {
    const payload: LambdaPayload = {
        status,
        failure_step: status == "failure" ? core.getInput("failure_step") : undefined,
        build_url: `https://github.com/${repoOwner}/${repoName}/actions/runs/${github.context.runId}`,
        number: github.context.runNumber,
        duration: endTime - beginTime,
        compare_url: `https://github.com/${repoOwner}/${repoName}/compare/${inputBaseSha}..${inputHeadSha}`,
        commit_hash: inputHeadSha,
        repository: [repoOwner, repoName].join("/"),
        ref: process.env.GITHUB_HEAD_REF,
        pr_number: Number(core.getInput("pr_number")),
        pr_name: core.getInput("pr_title"),
        commit: cinfo
    };
    new Lambda().invoke({
        FunctionName: "CIResultNotificationGHA",
        Payload: JSON.stringify(payload),
        InvocationType: "Event"
    }, (e, data) => {
        if (e) console.error("Invocation Failed!", e, e.stack);
        else console.log("Invocation OK", data);
    });
})

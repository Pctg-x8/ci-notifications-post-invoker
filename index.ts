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
    headSha: core.getInput("head_sha"),
    baseSha: core.getInput("base_sha"),
    reportName: core.getInput("report_name")
};
const { owner: repoOwner, repo: repoName } = github.context.repo;

type LambdaPayloadCommon = {
    readonly status: string;
    readonly failure_step?: string;
    readonly build_url: string;
    readonly number: number;
    readonly duration: number;
    readonly repository: string;
    readonly commit: CommitInfo;
    readonly report_name: string;
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

getCommitInfo(input.headSha).then(cinfo => {
    const commonPayload: LambdaPayloadCommon = {
        status: input.status,
        failure_step: input.status == "failure" ? core.getInput("failure_step") : undefined,
        build_url: `https://github.com/${repoOwner}/${repoName}/actions/runs/${github.context.runId}`,
        number: github.context.runNumber,
        duration: endTime - input.beginTime,
        repository: [repoOwner, repoName].join("/"),
        commit: cinfo,
        report_name: input.reportName
    };
    const payload = core.getInput("mode") == "diff" ? {
        compare_url: `https://github.com/${repoOwner}/${repoName}/compare/${input.baseSha}..${input.headSha}`,
        commit_hash: input.headSha,
        ref: process.env.GITHUB_HEAD_REF,
        pr_number: Number(core.getInput("pr_number")),
        pr_name: core.getInput("pr_title"),
        ... commonPayload
    } : {
        branch_name: github.context.ref,
        ... commonPayload
    };

    new Lambda({ region: process.env.AWS_DEFAULT_REGION }).invoke({
        FunctionName: "CIResultNotificationGHA",
        Payload: JSON.stringify(payload),
        InvocationType: "Event"
    }, (e, data) => {
        if (e) console.error("Invocation Failed!", e, e.stack);
        else console.log("Invocation OK", data);
    });
})

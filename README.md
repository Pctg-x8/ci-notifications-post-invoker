CI Notification Post-to-Slack function Invoker
---

## Input Parameters

### status
Status of PR Check(success / failure with failure_step name)
### begintime
Beginning time of checks execution
### head_sha (effective only mode=diff)
Merge HEAD branch SHA
### base_sha (effective only mode=diff)
Merge BASE branch SHA
### pr_number (effective only mode=diff)
PullRequest Number
### pr_title (effective only mode=diff)
PullRequest Title
### mode
diff or branch
### reporter_name
Name of Reporter

## Environment Parameters

### AWS_ACCESS_KEY_ID
AWS IAM User Access Key ID
### AWS_SECRET_ACCESS_KEY
AWS IAM User Access Secret Key
### AWS_DEFAULT_REGION
AWS Default Region to run Function

## Input Files

### .rawbuildlog | .buildlog
added into support_info (.buildlog will be added as code block)

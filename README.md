CI Notification Post-to-Slack function Invoker
---

## Input Parameters

### status
Status of PR Check(success / failure with failure_step name)
### begintime
Beginning time of checks execution
### head_sha
Merge HEAD branch SHA
### base_sha
Merge BASE branch SHA
### pr_number
PullRequest Number
### pr_title
PullRequest Title

## Environment Parameters

### AWS_ACCESS_KEY_ID
AWS IAM User Access Key ID
### AWS_SECRET_ACCESS_KEY
AWS IAM User Access Secret Key
### AWS_DEFAULT_REGION
AWS Default Region to run Function

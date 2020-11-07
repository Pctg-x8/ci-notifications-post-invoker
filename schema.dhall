let GithubActions = https://raw.githubusercontent.com/Pctg-x8/gha-schemas/master/schema.dhall

let Status = < Success | Failure : Text >
let decomposeStatus =
    let handler =
        { Success = toMap { status = "success" }
        , Failure = \(stepName: Text) -> toMap { status = "failure", failure_step = stepName }
        }
    in \(status: Status) -> merge handler status
let DiffModeParams =
    { head_sha : Text
    , base_sha : Text
    , pr_number: Text
    , pr_title : Text
    }
let Mode = < Diff : DiffModeParams | Branch >
let decomposeMode =
    let handler =
        { Diff = \(params : DiffModeParams) -> toMap { mode = "diff" } # toMap params
        , Branch = toMap { mode = "branch" }
        }
    in \(mode : Mode) -> merge handler mode
let Params =
    { status : Status
    , begintime : Text
    , report_name : Text
    , mode : Mode
    }
let ExecEnv =
    { AWS_ACCESS_KEY_ID : Text
    , AWS_SECRET_ACCESS_KEY : Text
    , AWS_DEFAULT_REGION : Text
    }
let step = \(params: Params) -> \(env: ExecEnv) -> GithubActions.Step::{
    , name = "Notify"
    , uses = Some "Pctg-x8/ci-notifications-post-invoker@master"
    , env = Some (toMap env)
    , `with` = Some (decomposeStatus params.status # decomposeMode params.mode # toMap {
        , begintime = params.begintime
        , report_name = params.report_name
        })
    }

in { Status, Params, ExecEnv, step }

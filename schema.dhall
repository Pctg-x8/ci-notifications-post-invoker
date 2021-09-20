let GithubActions =
      https://raw.githubusercontent.com/Pctg-x8/gha-schemas/master/schema.dhall

let Map/unpackOptionals =
      https://prelude.dhall-lang.org/Map/unpackOptionals.dhall

let Status = < Success | Failure : Text >

let decomposeStatus =
      let handler =
            { Success = toMap { status = "success" }
            , Failure =
                λ(stepName : Text) →
                  toMap { status = "failure", failure_step = stepName }
            }

      in  λ(status : Status) → merge handler status

let DiffModeParams =
      { head_sha : Text, base_sha : Text, pr_number : Text, pr_title : Text }

let Mode = < Diff : DiffModeParams | Branch >

let decomposeMode =
      let handler =
            { Diff =
                λ(params : DiffModeParams) →
                  toMap { mode = "diff" } # toMap params
            , Branch = toMap { mode = "branch" }
            }

      in  λ(mode : Mode) → merge handler mode

let Params =
      { status : Status, begintime : Text, report_name : Text, mode : Mode }

let mkParams =
      λ(params : Params) →
        let status = decomposeStatus params.status

        let mode = decomposeMode params.mode

        in    status
            # mode
            # Map/unpackOptionals
                Text
                Text
                ( toMap
                    { begintime = Some params.begintime
                    , report_name = Some params.report_name
                    }
                )

let step =
      λ(params : Params) →
        GithubActions.Step::{
        , name = "Notify"
        , uses = Some "Pctg-x8/ci-notifications-post-invoker@master"
        , `with` = Some (mkParams params)
        }

in  { Status, Params, step, Mode }

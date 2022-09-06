let GithubActions =
      https://raw.githubusercontent.com/Pctg-x8/gha-schemas/master/schema.dhall

let Map/unpackOptionals =
      https://prelude.dhall-lang.org/Map/unpackOptionals.dhall

let Map/map = https://prelude.dhall-lang.org/Map/map.dhall

let Status = < Success | Failure : Text >

let DiffModeParams =
      { head_sha : Text, base_sha : Text, pr_number : Text, pr_title : Text }

let Mode = < Diff : DiffModeParams | Branch >

let Params =
      { status : Status, begintime : Text, report_name : Text, mode : Mode }

let mkParams =
      λ(params : Params) →
        let statusHandler =
              { Success = toMap
                  { status = GithubActions.WithParameterType.Text "success" }
              , Failure =
                  λ(stepName : Text) →
                    toMap
                      { status = GithubActions.WithParameterType.Text "failure"
                      , failure_step =
                          GithubActions.WithParameterType.Text stepName
                      }
              }

        let status = merge statusHandler params.status

        let modeHandler =
              { Diff =
                  λ(params : DiffModeParams) →
                    Map/map
                      Text
                      Text
                      GithubActions.WithParameterType
                      GithubActions.WithParameterType.Text
                      (toMap { mode = "diff" } # toMap params)
              , Branch = toMap
                  { mode = GithubActions.WithParameterType.Text "branch" }
              }

        let mode = merge modeHandler params.mode

        in    status
            # mode
            # Map/unpackOptionals
                Text
                GithubActions.WithParameterType
                ( toMap
                    { begintime = Some
                        (GithubActions.WithParameterType.Text params.begintime)
                    , report_name = Some
                        ( GithubActions.WithParameterType.Text
                            params.report_name
                        )
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

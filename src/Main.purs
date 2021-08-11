module Main where

import Prelude

import Actions.Context as Context
import Actions.Core as Core
import Actions.Exec (exec)
import BuildLogs (buildlogPath, loadLogs, maxAvailableLines, rawbuildlogPath)
import Data.Array (dropEnd, fold, intercalate, last, length, takeEnd)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromJust, fromMaybe, maybe)
import Data.String (Pattern(..), split)
import Data.String as String
import Data.String.Regex as Regex
import Data.String.Regex.Flags as RegexFlags
import Data.String.Regex.Unsafe (unsafeRegex)
import Data.String.Utils (endsWith, trimEnd)
import Effect (Effect)
import Effect.Aff (Aff, launchAff_, parallel, sequential, try)
import Effect.Aff as Exc
import Effect.Class (liftEffect)
import Effect.Class.Console as Console
import Effect.Exception (throw)
import Effect.Ref as EffectRef
import Helper (splitN)
import Inputs as Input
import Lambda as Lambda
import Node.Buffer as Buffer
import Node.Encoding (Encoding(..))
import Partial.Unsafe (unsafePartial)
import Record as Record

repoPath :: String
repoPath = intercalate "/" [Context.repoOwner, Context.repoName]

buildRunsUrl :: Int -> String
buildRunsUrl id = fold ["https://github.com/", repoPath, "/actions/runs/", show id]

buildCompareUrl :: String -> String -> String
buildCompareUrl base head = fold ["https://github.com/", repoPath, "/compare/", base, "..", head]

getCommitInfo :: String -> Aff Lambda.CommitInfo
getCommitInfo head = do
  outputStrings <- liftEffect $ EffectRef.new ""
  let
    handleStdout = \b -> do
      s <- Buffer.toString UTF8 b
      EffectRef.modify_ (_ <> s) outputStrings
  exitCode <- exec "git" ["log", "--format=%cn%x09%B", "-n", "1", head] { listeners: { stdout: handleStdout } }
  liftEffect $ when (exitCode /= 0) $ throw $ "git log exited with code " <> show exitCode
  parts <- liftEffect ((splitN "\t" 2 <<< trimEnd) <$> EffectRef.read outputStrings)
  pure
    { committer: unsafePartial fromJust $ Array.index parts 0
    , message: unsafePartial fromJust $ Array.index parts 1
    , sha: head
    }

getLastBuildLog :: String -> { targetLines :: Array String, omitted :: Boolean }
getLastBuildLog content =
  let
    dropEmptyTails a = if maybe false (_ == "") $ last a then dropEnd 1 a else a
    lines = dropEmptyTails $ split (Pattern "\n") content
    targetLineCount = min maxAvailableLines $ length lines
    removeCarriageReturn = Regex.replace (unsafeRegex "\r$" RegexFlags.noFlags) ""
  in
    { targetLines: map removeCarriageReturn $ takeEnd targetLineCount lines
    , omitted: length lines > maxAvailableLines
    }

constructDiffPayload :: Record Lambda.CommonPayload -> Aff Lambda.Payload
constructDiffPayload common = do
  headSha <- liftEffect Input.headSha
  baseSha <- liftEffect Input.baseSha
  pr_number <- liftEffect Input.prNumber
  pr_name <- liftEffect Input.prName
  ref <- unsafePartial fromJust <$> liftEffect Core.headRef
  commit <- getCommitInfo headSha
  pure $ Lambda.Diff $ Record.merge common
    { compare_url: buildCompareUrl baseSha headSha
    , commit_hash: headSha
    , ref
    , pr_number
    , pr_name
    , commit
    }

mapTo :: forall f a b. Functor f => f a -> (a -> b) -> f b
mapTo = flip map

constructBranchPayload :: Record Lambda.CommonPayload -> Aff Lambda.Payload
constructBranchPayload common = getCommitInfo Context.sha `mapTo` \commit -> Lambda.Branch $ Record.merge common
  { branch_name: Regex.replace (unsafeRegex "^refs/heads/" RegexFlags.noFlags) "" Context.ref
  , commit
  }

constructBuildLogLines :: String -> Aff (Maybe String)
constructBuildLogLines workspacePath = do
  { buildlog, rawbuildlog } <- sequential ado
    buildlog <- parallel $ loadLogs $ buildlogPath workspacePath
    rawbuildlog <- parallel $ loadLogs $ rawbuildlogPath workspacePath
  in { buildlog, rawbuildlog }
  let
    supportInfoRawLogs = fromMaybe "" rawbuildlog
    needsPreLineFeed = supportInfoRawLogs /= "" && not (endsWith "\n" supportInfoRawLogs)
    supportInfoBuildLogs = flip (maybe "") buildlog \l ->
      let
        { targetLines, omitted } = getLastBuildLog l
        lines = if omitted then Array.concat [["..."], targetLines] else targetLines
      in "```\n" <> intercalate "\n" lines <> "\n```"
    logLines = fold [supportInfoRawLogs, if needsPreLineFeed then "\n" else "", supportInfoBuildLogs]
  pure $ if String.null logLines then Nothing else Just logLines

main :: Effect Unit
main = launchAff_ $ do
  duration <- liftEffect Input.duration
  status <- liftEffect Input.status
  failureStep <- if not $ Input.succeeded status
    then Just <$> liftEffect Input.failureStep
    else pure Nothing
  reportName <- liftEffect Input.reportName
  supportInfo <- liftEffect Core.workspacePath >>= constructBuildLogLines
  let
    commonPayload :: Record Lambda.CommonPayload
    commonPayload =
      { status
      , failure_step: failureStep
      , build_url: buildRunsUrl Context.runId
      , number: Context.runNumber
      , duration
      , repository: repoPath
      , report_name: reportName
      , support_info: supportInfo
      }
  payload <- liftEffect Input.mode >>= case _ of
    Input.Diff -> constructDiffPayload commonPayload
    Input.Branch -> constructBranchPayload commonPayload
  r <- try $ Lambda.invoke payload
  case r of
    Left e -> Console.error $ "Invocation Failed! " <> Exc.message e
    Right _ -> Console.log $ "Invocation OK"
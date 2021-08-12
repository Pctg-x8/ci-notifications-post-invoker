module Inputs where

import Prelude

import Actions.Core as Core
import Data.DateTime.Instant (unInstant)
import Data.Int (fromString)
import Data.Maybe (maybe)
import Data.Newtype (unwrap, wrap)
import Data.Number as Number
import Data.Time.Duration (Milliseconds, Seconds, convertDuration, negateDuration)
import Effect (Effect)
import Effect.Exception (throw)
import Effect.Now (now)

endTime :: Effect Milliseconds
endTime = unInstant <$> now

beginTime :: Effect Seconds
beginTime = do
  value <- Number.fromString <$> Core.getRequiredInput "begintime"
  maybe (throw $ "begintime is not valid integer value") (pure <<< wrap) value

duration :: Effect Seconds
duration = ado
  begin <- beginTime
  end <- convertDuration <$> endTime
in end <> negateDuration begin

status :: Effect String
status = Core.getRequiredInput "status"

succeeded :: String -> Boolean
succeeded s = s == "success"

failureStep :: Effect String
failureStep = Core.getRequiredInput "failure_step"

headSha :: Effect String
headSha = Core.getRequiredInput "head_sha"

baseSha :: Effect String
baseSha = Core.getRequiredInput "base_sha"

reportName :: Effect String
reportName = Core.getRequiredInput "report_name"

data Mode = Diff | Branch
mode :: Effect Mode
mode = Core.getRequiredInput "mode" >>= case _ of
  "diff" -> pure Diff
  "branch" -> pure Branch
  _ -> throw "mode must be either diff or branch"

prNumber :: Effect Int
prNumber = (fromString <$> Core.getRequiredInput "pr_number") >>= maybe (throw "invalid pr_number") pure

prTitle :: Effect String
prTitle = Core.getRequiredInput "pr_title"


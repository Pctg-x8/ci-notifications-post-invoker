module Actions.Core where

import Prelude

import Data.Maybe (Maybe, fromJust, maybe)
import Data.String (toUpper)
import Effect (Effect)
import Effect.Exception (throw)
import Node.Path (FilePath)
import Node.Process (lookupEnv)
import Partial.Unsafe (unsafePartial)

workspacePath :: Effect FilePath
workspacePath = unsafePartial fromJust <$> lookupEnv "GITHUB_WORKSPACE"

headRef :: Effect (Maybe String)
headRef = lookupEnv "GITHUB_HEAD_REF"

getInput :: String -> Effect (Maybe String)
getInput name = lookupEnv $ "INPUT_" <> toUpper name

getRequiredInput :: String -> Effect String
getRequiredInput name = getInput name >>= maybe (throw $ "Input required and not supplied: " <> name) pure

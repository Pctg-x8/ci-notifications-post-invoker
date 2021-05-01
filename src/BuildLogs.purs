module BuildLogs where

import Prelude

import Data.Maybe (Maybe(..))
import Effect.Aff (Aff, Error, catchError, throwError)
import Node.Encoding (Encoding(..))
import Node.FS.Aff (readTextFile)
import Node.Path (FilePath)
import Node.Path as Path

foreign import unsafeExtractErrorCode :: Error -> String

maxAvailableLines :: Int
maxAvailableLines = 15

rawbuildlogPath :: FilePath -> FilePath
rawbuildlogPath workspacePath = Path.concat [workspacePath, ".rawbuildlog"]

buildlogPath :: FilePath -> FilePath
buildlogPath workspacePath = Path.concat [workspacePath, ".buildlog"]

loadLogs :: FilePath -> Aff (Maybe String)
loadLogs path = catchError
  (Just <$> readTextFile UTF8 path)
  \e -> if unsafeExtractErrorCode e == "ENOENT" then pure Nothing else throwError e

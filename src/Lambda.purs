module Lambda where

import Prelude

import Data.Either (Either(..))
import Data.Maybe (Maybe)
import Effect (Effect)
import Effect.Aff (Aff, Canceler(..), makeAff)
import Effect.Exception as Exc
import Foreign.Generic (encodeJSON)

type CommitInfo =
  { committer :: String
  , message :: String
  , sha :: String
  }

type CommonPayload =
  ( status :: String
  , failure_step :: Maybe String
  , build_url :: String
  , number :: Int
  , duration :: Int
  , repository :: String
  , report_name :: String
  , support_info :: Maybe String
  )
type DiffPayload = Record
  ( compare_url :: String
  , commit_hash :: String
  , ref :: String
  , pr_number :: Int
  , pr_name :: String
  , commit :: CommitInfo
  | CommonPayload
  )
type BranchPayload = Record
  ( branch_name :: String
  , commit :: CommitInfo
  | CommonPayload
  )
data Payload = Diff DiffPayload | Branch BranchPayload

foreign import data AWSError :: Type
foreign import awsErrorMessage :: AWSError -> String
foreign import data InvocationResponse :: Type
foreign import invokeEventNative :: String -> String -> (AWSError -> Effect Unit) -> (InvocationResponse -> Effect Unit) -> Effect Unit

invoke :: Payload -> Aff InvocationResponse
invoke payload = makeAff \handler -> do
  let
    payloadStr = case payload of
      Diff p -> encodeJSON p
      Branch p -> encodeJSON p
    convertError = Exc.error <<< awsErrorMessage
  invokeEventNative "CIResultNotificationGHA" payloadStr (handler <<< Left <<< convertError) (handler <<< Right)
  pure $ Canceler \_ -> pure unit

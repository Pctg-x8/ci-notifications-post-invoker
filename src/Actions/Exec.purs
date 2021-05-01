module Actions.Exec where

import Prelude

import Data.Either (Either(..))
import Effect (Effect)
import Effect.Aff (Aff, Canceler(..), Error, makeAff)
import Node.Buffer (Buffer)

foreign import execNative :: String -> Array String -> ExecOptions -> (Error -> Effect Unit) -> (Int -> Effect Unit) -> Effect Unit

type ExecListeners =
  { stdout :: Buffer -> Effect Unit
  }
type ExecOptions =
  { listeners :: ExecListeners
  }

exec :: String -> Array String -> ExecOptions -> Aff Int
exec cmd args opts = makeAff \handler -> do
  execNative cmd args opts (handler <<< Left) (handler <<< Right)
  pure $ Canceler \_ -> pure unit

import { Awaitable, NextApiRequest, NextApiResponse } from "./utils"
import {
  CallbacksOptions,
  CookiesOptions,
  EventCallbacks,
  LoggerInstance,
  PagesOptions,
  SessionOptions,
  Theme,
} from ".."
import { Provider } from "../providers"
import { JWTOptions } from "../jwt"
import { Adapter } from "../adapters"

export type InternalProvider = Provider & {
  signinUrl: string
  callbackUrl: string
}

export interface InternalOptions<P extends InternalProvider = never> {
  providers: InternalProvider[]
  baseUrl: string
  basePath: string
  action:
    | "providers"
    | "session"
    | "csrf"
    | "signin"
    | "signout"
    | "callback"
    | "verify-request"
    | "error"
  pkce?: {
    code_verifier?: string
    /**
     * Could be `"plain"`, but not recommended.
     * We ignore it for now.
     * @spec https://tools.ietf.org/html/rfc7636#section-4.2.
     */
    code_challenge_method?: "S256"
  }
  provider: P
  csrfToken?: string
  csrfTokenVerified?: boolean
  secret: string
  theme: Theme
  debug: boolean
  logger: LoggerInstance
  session: Required<SessionOptions>
  pages: Partial<PagesOptions>
  jwt: JWTOptions
  events: Partial<EventCallbacks>
  adapter: Adapter
  callbacks: CallbacksOptions
  cookies: CookiesOptions
  callbackUrl: string
}

export interface NextAuthRequest extends NextApiRequest {
  options: InternalOptions
}

export type NextAuthResponse = NextApiResponse

export type NextAuthApiHandler = (
  req: NextAuthRequest,
  res: NextAuthResponse
) => Awaitable<void>

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
import { AppProvider } from "../providers"
import { JWTOptions } from "next-auth/jwt"
import { Adapter } from "next-auth/adapters"

export interface InternalOptions {
  providers: AppProvider[]
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
  provider?: AppProvider
  csrfToken?: string
  csrfTokenVerified?: boolean
  secret: string
  theme: Theme
  debug: boolean
  logger: LoggerInstance
  session: Required<SessionOptions>
  pages: PagesOptions
  jwt: JWTOptions
  events: EventCallbacks
  adapter: ReturnType<Adapter>
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

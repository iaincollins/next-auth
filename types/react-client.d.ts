import * as React from "react"
import { IncomingMessage } from "http"
import { Session } from "."
import { ProviderType } from "./providers"

export interface CtxOrReq {
  req?: IncomingMessage
  ctx?: { req: IncomingMessage }
}

/***************
 * Session types
 **************/

export type GetSessionOptions = CtxOrReq & {
  /** Wheter to broadcast the session to other tabs/windows */
  broadcast?: boolean
}

/**
 * React Hook that gives you access
 * to the logged in user's session data.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#usesession)
 */
export function useSession(): [Session | null, boolean]

/**
 * Can be called client or server side to return a session asynchronously.
 * It calls `/api/auth/session` and returns a promise with a session object,
 * or null if no session exists.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#getsession)
 */
export function getSession(options?: GetSessionOptions): Promise<Session | null>

/*******************
 * CSRF Token types
 ******************/

/**
 * Returns the current Cross Site Request Forgery Token (CSRF Token)
 * required to make POST requests (e.g. for signing in and signing out).
 * You likely only need to use this if you are not using the built-in
 * `signIn()` and `signOut()` methods.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#getcsrftoken)
 */
export function getCsrfToken(ctxOrReq?: CtxOrReq): Promise<string | null>

/******************
 * Providers types
 *****************/

export interface ClientSafeProvider {
  id: string
  name: string
  type: ProviderType
  signinUrl: string
  callbackUrl: string
}

/**
 * It calls `/api/auth/providers` and returns
 * a list of the currently configured authentication providers.
 * It can be useful if you are creating a dynamic custom sign in page.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#getproviders)
 */
export function getProviders(): Promise<Record<
  string,
  ClientSafeProvider
> | null>

/****************
 * Sign in types
 ***************/

export type RedirectableProvider = "email" | "credentials"

export type SignInProvider = RedirectableProvider | string | undefined

export interface SignInOptions extends Record<string, unknown> {
  /**
   * Defaults to the current URL.
   * @docs https://next-auth.js.org/getting-started/client#specifying-a-callbackurl
   */
  callbackUrl?: string
  /** @docs https://next-auth.js.org/getting-started/client#using-the-redirect-false-option */
  redirect?: boolean
}

export interface SignInResponse {
  error: string | undefined
  status: number
  ok: boolean
  url: string | null
}

/** Match `inputType` of `new URLSearchParams(inputType)` */
export type SignInAuthorisationParams =
  | string
  | string[][]
  | Record<string, string>
  | URLSearchParams

/**
 * Client-side method to initiate a signin flow
 * or send the user to the signin page listing all possible providers.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#signin)
 */
export function signIn<P extends SignInProvider = undefined>(
  provider?: P,
  options?: SignInOptions,
  authorizationParams?: SignInAuthorisationParams
): Promise<
  P extends RedirectableProvider ? SignInResponse | undefined : undefined
>

/****************
 * Sign out types
 ****************/

/** @docs https://next-auth.js.org/getting-started/client#using-the-redirect-false-option-1 */
export interface SignOutResponse {
  url: string
}

export interface SignOutParams<R extends boolean = true> {
  /** @docs https://next-auth.js.org/getting-started/client#specifying-a-callbackurl-1 */
  callbackUrl?: string
  /** @docs https://next-auth.js.org/getting-started/client#using-the-redirect-false-option-1 */
  redirect?: R
}

/**
 * Signs the user out, by removing the session cookie.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#signout)
 */
export function signOut<R extends boolean = true>(
  params?: SignOutParams<R>
): Promise<R extends true ? undefined : SignOutResponse>

/************************
 * SessionProvider types
 ***********************/

/** @docs: https://next-auth.js.org/getting-started/client#options */
export interface SessionProviderProps {
  session?: Session
  baseUrl?: string
  basePath?: string
  /**
   * The amount of time (in seconds) after a session should be considered stale.
   * If set to `0` (default), the session will never be re-fetched.
   */
  staleTime?: number
  /**
   * A time interval (in seconds) after which the session will be re-fetched.
   * If set to `0` (default), the session is not polled.
   */
  refetchInterval?: number
  /**
   * If a user leaves your application's tab/window and returns to stale data,
   * the `SessionProvider` automatically requests
   * a fresh session in the background.
   * Disable this by setting this to `false`.
   */
  refetchOnWindowFocus?: boolean
  /**
   * If your application is opened in multiple tabs/windows (of the same browser instance),
   * every tab/window will maintain its own copy of the local session state;
   * the session is not stored in shared storage like `localStorage` or `sessionStorage`.
   * Any update in one tab/window sends a signal to other tabs/windows
   * to request an update of their own session state.
   *
   * Set `broadcast={false}` for no broadcasting,
   * or see the object options for more granular control.
   */
  broadcast?:
    | {
        /**
         * By default, when a session is updated
         * (eg.: through client-side call of `getSession`,
         * on window focus, or when a stale session is updated),
         * a signal is broadcasted to other tabs/windows
         * to update their copy of the session.
         *
         * @note Since `refetchInterval` sets up its own session polling,
         * that event is never broadcasted.
         *
         * Set this option to `false` if you do not need this behaviour.
         */
        session?: boolean
        /**
         * By default, when you invoke the `signOut` method, this will broadcast
         * a signal to other tabs/windows, to delete their copy of the session.
         * Set this option to `false` if you do not need this behaviour.
         */
        signOut?: boolean
      }
    | false
}

/**
 * Provider to wrap the app in to make session data available globally.
 * Can also be used to throttle the number of requests to the endpoint
 * `/api/auth/session`.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#sessionprovider)
 */
export const SessionProvider: React.FC<SessionProviderProps>

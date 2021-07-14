// Minimum TypeScript Version: 3.6

/// <reference types="node" />

import { Adapter } from "./adapters"
import { JWTOptions, JWT } from "./jwt"
import { AppProviders, Credentials } from "./providers"
import {
  Awaitable,
  NextApiRequest,
  NextApiResponse,
  NextApiHandler,
} from "./internals/utils"
import { TokenSetParameters } from "openid-client"

/**
 * Configure your NextAuth instance
 *
 * [Documentation](https://next-auth.js.org/configuration/options#options)
 */
export interface NextAuthOptions {
  /**
   * An array of authentication providers for signing in
   * (e.g. Google, Facebook, Twitter, GitHub, Email, etc) in any order.
   * This can be one of the built-in providers or an object with a custom provider.
   * * **Default value**: `[]`
   * * **Required**: *Yes*
   *
   * [Documentation](https://next-auth.js.org/configuration/options#providers) | [Providers documentation](https://next-auth.js.org/configuration/providers)
   */
  providers: AppProviders
  /**
   * A random string used to hash tokens, sign cookies and generate cryptographic keys.
   * If not specified is uses a hash of all configuration options, including Client ID / Secrets for entropy.
   * The default behavior is volatile, and **it is strongly recommended** you explicitly specify a value
   * to avoid invalidating end user sessions when configuration changes are deployed.
   * * **Default value**: `string` (SHA hash of the "options" object)
   * * **Required**: No - **but strongly recommended**!
   *
   * [Documentation](https://next-auth.js.org/configuration/options#secret)
   */
  secret?: string
  /**
   * Configure your session like if you want to use JWT or a database,
   * how long until an idle session expires, or to throttle write operations in case you are using a database.
   * * **Default value**: See the documentation page
   * * **Required**: No
   *
   * [Documentation](https://next-auth.js.org/configuration/options#session)
   */
  session?: SessionOptions
  /**
   * JSON Web Tokens can be used for session tokens if enabled with the `session: { jwt: true }` option.
   * JSON Web Tokens are enabled by default if you have not specified a database.
   * By default JSON Web Tokens are signed (JWS) but not encrypted (JWE),
   * as JWT encryption adds additional overhead and comes with some caveats.
   * You can enable encryption by setting `encryption: true`.
   * * **Default value**: See the documentation page
   * * **Required**: *No*
   *
   * [Documentation](https://next-auth.js.org/configuration/options#jwt)
   */
  jwt?: JWTOptions
  /**
   * Specify URLs to be used if you want to create custom sign in, sign out and error pages.
   * Pages specified will override the corresponding built-in page.
   * * **Default value**: `{}`
   * * **Required**: *No*
   * @example
   *
   * ```js
   *   pages: {
   *     signIn: '/auth/signin',
   *     signOut: '/auth/signout',
   *     error: '/auth/error',
   *     verifyRequest: '/auth/verify-request',
   *     newUser: '/auth/new-user'
   *   }
   * ```
   *
   * [Documentation](https://next-auth.js.org/configuration/options#pages) | [Pages documentation](https://next-auth.js.org/configuration/pages)
   */
  pages?: PagesOptions
  /**
   * Callbacks are asynchronous functions you can use to control what happens when an action is performed.
   * Callbacks are *extremely powerful*, especially in scenarios involving JSON Web Tokens
   * as they **allow you to implement access controls without a database** and to **integrate with external databases or APIs**.
   * * **Default value**: See the Callbacks documentation
   * * **Required**: *No*
   *
   * [Documentation](https://next-auth.js.org/configuration/options#callbacks) | [Callbacks documentation](https://next-auth.js.org/configuration/callbacks)
   */
  callbacks?: Partial<CallbacksOptions>
  /**
   * Events are asynchronous functions that do not return a response, they are useful for audit logging.
   * You can specify a handler for any of these events below - e.g. for debugging or to create an audit log.
   * The content of the message object varies depending on the flow
   * (e.g. OAuth or Email authentication flow, JWT or database sessions, etc),
   * but typically contains a user object and/or contents of the JSON Web Token
   * and other information relevant to the event.
   * * **Default value**: `{}`
   * * **Required**: *No*
   *
   * [Documentation](https://next-auth.js.org/configuration/options#events) | [Events documentation](https://next-auth.js.org/configuration/events)
   */
  events?: Partial<EventCallbacks>
  /**
   * You can use the adapter option to pass in your database adapter.
   *
   * * **Required**: *No*
   *
   * [Documentation](https://next-auth.js.org/configuration/options#adapter) |
   * [Community adapters](https://github.com/nextauthjs/adapters)
   */
  adapter?: ReturnType<Adapter>
  /**
   * Set debug to true to enable debug messages for authentication and database operations.
   * * **Default value**: `false`
   * * **Required**: *No*
   *
   * - ⚠ If you added a custom `logger`, this setting is ignored.
   *
   * [Documentation](https://next-auth.js.org/configuration/options#debug) | [Logger documentation](https://next-auth.js.org/configuration/options#logger)
   */
  debug?: boolean
  /**
   * Override any of the logger levels (`undefined` levels will use the built-in logger),
   * and intercept logs in NextAuth. You can use this option to send NextAuth logs to a third-party logging service.
   * * **Default value**: `console`
   * * **Required**: *No*
   *
   * @example
   *
   * ```js
   * // /pages/api/auth/[...nextauth].js
   * import log from "logging-service"
   * export default NextAuth({
   *   logger: {
   *     error(code, ...message) {
   *       log.error(code, message)
   *     },
   *     warn(code, ...message) {
   *       log.warn(code, message)
   *     },
   *     debug(code, ...message) {
   *       log.debug(code, message)
   *     }
   *   }
   * })
   * ```
   *
   * - ⚠ When set, the `debug` option is ignored
   *
   * [Documentation](https://next-auth.js.org/configuration/options#logger) |
   * [Debug documentation](https://next-auth.js.org/configuration/options#debug)
   */
  logger?: LoggerInstance
  /**
   * Changes the theme of pages.
   * Set to `"light"` if you want to force pages to always be light.
   * Set to `"dark"` if you want to force pages to always be dark.
   * Set to `"auto"`, (or leave this option out)if you want the pages to follow the preferred system theme.
   * * **Default value**: `"auto"`
   * * **Required**: *No*
   *
   * [Documentation](https://next-auth.js.org/configuration/options#theme) | [Pages documentation]("https://next-auth.js.org/configuration/pages")
   */
  theme?: Theme
  /**
   * When set to `true` then all cookies set by NextAuth.js will only be accessible from HTTPS URLs.
   * This option defaults to `false` on URLs that start with `http://` (e.g. http://localhost:3000) for developer convenience.
   * You can manually set this option to `false` to disable this security feature and allow cookies
   * to be accessible from non-secured URLs (this is not recommended).
   * * **Default value**: `true` for HTTPS and `false` for HTTP sites
   * * **Required**: No
   *
   * [Documentation](https://next-auth.js.org/configuration/options#usesecurecookies)
   *
   * - ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
   * but **may have complex implications** or side effects.
   * You should **try to avoid using advanced options** unless you are very comfortable using them.
   */
  useSecureCookies?: boolean
  /**
   * You can override the default cookie names and options for any of the cookies used by NextAuth.js.
   * You can specify one or more cookies with custom properties,
   * but if you specify custom options for a cookie you must provide all the options for that cookie.
   * If you use this feature, you will likely want to create conditional behavior
   * to support setting different cookies policies in development and production builds,
   * as you will be opting out of the built-in dynamic policy.
   * * **Default value**: `{}`
   * * **Required**: No
   *
   * - ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
   * but **may have complex implications** or side effects.
   * You should **try to avoid using advanced options** unless you are very comfortable using them.
   *
   * [Documentation](https://next-auth.js.org/configuration/options#cookies) | [Usage example](https://next-auth.js.org/configuration/options#example)
   */
  cookies?: Partial<CookiesOptions>
}

/**
 * Change the theme of the built-in pages.
 *
 * [Documentation](https://next-auth.js.org/configuration/options#theme) |
 * [Pages](https://next-auth.js.org/configuration/pages)
 */
export type Theme = "auto" | "dark" | "light"

/**
 * Override any of the methods, and the rest will use the default logger.
 *
 * [Documentation](https://next-auth.js.org/configuration/options#logger)
 */
export interface LoggerInstance {
  warn(
    code:
      | "JWT_AUTO_GENERATED_SIGNING_KEY"
      | "JWT_AUTO_GENERATED_ENCRYPTION_KEY"
      | "NEXTAUTH_URL"
  ): void
  error(
    code: string,
    /**
     * Either an instance of (JSON serializable) Error
     * or an object that contains some debug information.
     * (Error is still available through `metadata.error`)
     */
    metadata: Error | { error: Error; [key: string]: unknown }
  ): void
  debug(code: string, metadata: unknown): void
}

/**
 * Different tokens returned by OAuth Providers.
 * Some of them are available with different casing,
 * but they refer to the same value.
 */
export type TokenSet = TokenSetParameters

/**
 * Usually contains information about the provider being used
 * and also extends `TokenSet`, which is different tokens returned by OAuth Providers.
 */
export interface Account extends Partial<TokenSet> {
  id: string
  provider: string
  type: string
}

export interface DefaultProfile {
  sub?: string
  name?: string
  email?: string
  image?: string
}

/** The OAuth profile returned from your provider */
export interface Profile extends Record<string, unknown>, DefaultProfile {}

/** [Documentation](https://next-auth.js.org/configuration/callbacks) */
export interface CallbacksOptions<
  P extends Record<string, unknown> = Profile,
  A extends Record<string, unknown> = Account
> {
  /**
   * Use this callback to control if a user is allowed to sign in.
   * Returning true will continue the sign-in flow.
   * Throwing an error or returning a string will stop the flow, and redirect the user.
   *
   * [Documentation](https://next-auth.js.org/configuration/callbacks#sign-in-callback)
   */
  signIn(params: {
    user: User
    account: A
    /**
     * If OAuth provider is used, it contains the full
     * OAuth profile returned by your provider.
     */
    profile: P & Record<string, unknown>
    /**
     * If Email provider is used, it contains the email, and optionally on the first call a
     * `verificationRequest: true` property to indicate it is being triggered in the verification request flow.
     * When the callback is invoked after a user has clicked on a sign in link,
     * this property will not be present. You can check for the `verificationRequest` property
     * to avoid sending emails to addresses or domains on a blocklist or to only explicitly generate them
     * for email address in an allow list.
     */
    email: {
      email: string | null
      verificationRequest?: boolean
    }
    /** If Credentials provider is used, it contains the user credentials */
    credentials: Credentials
  }): Awaitable<string | boolean>
  /**
   * This callback is called anytime the user is redirected to a callback URL (e.g. on signin or signout).
   * By default only URLs on the same URL as the site are allowed,
   * you can use this callback to customise that behaviour.
   *
   * [Documentation](https://next-auth.js.org/configuration/callbacks#redirect-callback)
   */
  redirect(params: {
    /** URL provided as callback URL by the client */
    url: string
    /** Default base URL of site (can be used as fallback) */
    baseUrl: string
  }): Awaitable<string>
  /**
   * This callback is called whenever a session is checked.
   * (Eg.: invoking the `/api/session` endpoint, using `useSession` or `getSession`)
   *
   * ⚠ By default, only a subset (email, name, imgage)
   * of the token is returned for increased security.
   *
   * If you want to make something available you added to the token through the `jwt` callback,
   * you have to explicitely forward it here to make it available to the client.
   *
   * [Documentation](https://next-auth.js.org/configuration/callbacks#session-callback) |
   * [`jwt` callback](https://next-auth.js.org/configuration/callbacks#jwt-callback) |
   * [`useSession`](https://next-auth.js.org/getting-started/client#usesession) |
   * [`getSession`](https://next-auth.js.org/getting-started/client#getsession) |
   *
   */
  session(params: {
    session: Session
    user: User
    token: JWT
  }): Awaitable<Session>
  /**
   * This callback is called whenever a JSON Web Token is created (i.e. at sign in)
   * or updated (i.e whenever a session is accessed in the client).
   * Its content is forwarded to the `session` callback,
   * where you can control what should be returned to the client.
   * Anything else will be kept from your front-end.
   *
   * ⚠ By default the JWT is signed, but not encrypted.
   *
   * [Documentation](https://next-auth.js.org/configuration/callbacks#jwt-callback) |
   * [`session` callback](https://next-auth.js.org/configuration/callbacks#session-callback)
   */
  jwt(params: {
    token: JWT
    user?: User
    account?: A
    profile?: P
    isNewUser?: boolean
  }): Awaitable<JWT>
}

/** [Documentation](https://next-auth.js.org/configuration/options#cookies) */
export interface CookieOption {
  name: string
  options: {
    httpOnly: boolean
    sameSite: true | "strict" | "lax" | "none"
    path?: string
    secure: boolean
    maxAge?: number
    domain?: string
  }
}

/** [Documentation](https://next-auth.js.org/configuration/options#cookies) */
export interface CookiesOptions {
  sessionToken: CookieOption
  callbackUrl: CookieOption
  csrfToken: CookieOption
  pkceCodeVerifier: CookieOption
}

/**
 *  The various event callbacks you can register for from next-auth
 *
 * [Documentation](https://next-auth.js.org/configuration/events)
 */
export interface EventCallbacks {
  /**
   * If using a `credentials` type auth, the user is the raw response from your
   * credential provider.
   * For other providers, you'll get the User object from your adapter, the account,
   * and an indicator if the user was new to your Adapter.
   */
  signIn(message: {
    user: User
    account: Account
    profile?: Profile
    isNewUser?: boolean
  }): Awaitable<void>
  /**
   * The message object will contain one of these depending on
   * if you use JWT or database persisted sessions:
   * - `token`: The JWT token for this session.
   * - `session`: The session object from your adapter that is being ended.
   */
  signOut(message: { session: Session; token: JWT }): Awaitable<void>
  createUser(message: { user: User }): Awaitable<void>
  updateUser(message: { user: User }): Awaitable<void>
  linkAccount(message: {
    user: User
    providerAccount: Record<string, unknown>
  }): Awaitable<void>
  /**
   * The message object will contain one of these depending on
   * if you use JWT or database persisted sessions:
   * - `token`: The JWT token for this session.
   * - `session`: The session object from your adapter.
   */
  session(message: { session: Session; token: JWT }): Awaitable<void>
}

export type EventType = keyof EventCallbacks

/** [Documentation](https://next-auth.js.org/configuration/pages) */
export interface PagesOptions {
  signIn?: string
  signOut?: string
  /** Error code passed in query string as ?error= */
  error?: string
  verifyRequest?: string
  /** If set, new users will be directed here on first sign in */
  newUser?: string
}

export interface DefaultSession extends Record<string, unknown> {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires?: string
}

/**
 * Returned by `useSession`, `getSession`, returned by the `session` callback
 * and also the shape received as a prop on the `SessionProvider` React Context
 *
 * [`useSession`](https://next-auth.js.org/getting-started/client#usesession) |
 * [`getSession`](https://next-auth.js.org/getting-started/client#getsession) |
 * [`SessionProvider`](https://next-auth.js.org/getting-started/client#sessionprovider) |
 * [`session` callback](https://next-auth.js.org/configuration/callbacks#jwt-callback)
 */
export interface Session extends Record<string, unknown>, DefaultSession {}

/** [Documentation](https://next-auth.js.org/configuration/options#session) */
export interface SessionOptions {
  jwt?: boolean
  maxAge?: number
  updateAge?: number
}

export interface DefaultUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

/**
 * The shape of the returned object in the OAuth providers' `profile` callback,
 * available in the `jwt` and `session` callbacks,
 * or the second parameter of the `session` callback, when using a database.
 *
 * [`signIn` callback](https://next-auth.js.org/configuration/callbacks#sign-in-callback) |
 * [`session` callback](https://next-auth.js.org/configuration/callbacks#jwt-callback) |
 * [`jwt` callback](https://next-auth.js.org/configuration/callbacks#jwt-callback) |
 * [`profile` OAuth provider callback](https://next-auth.js.org/configuration/providers#using-a-custom-provider)
 */
export interface User extends Record<string, unknown>, DefaultUser {}

declare function NextAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  options: NextAuthOptions
): ReturnType<NextApiHandler>

declare function NextAuth(options: NextAuthOptions): ReturnType<NextApiHandler>

export default NextAuth

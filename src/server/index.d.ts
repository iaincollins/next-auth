import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { LoggerInstance } from 'src/lib/logger'
import { CallbacksOptions } from './lib/callbacks'
import { CookiesOptions } from './lib/cookie'
import { EventsOptions } from './lib/events'

export interface Provider {
  id: string
  name: string
  type: string
  version: string
  params: Record<string, unknown>
  scope: string
  accessTokenUrl: string
  authorizationUrl: string
  profileUrl?: string
  grant_type?: string
  profile?: (profile: any) => Promise<any>
}

export interface NextAuthPages {
  signIn?: string
  signOut?: string
  /** Error code passed in query string as ?error= */
  error?: string
  verifyRequest?: string
  /** If set, new users will be directed here on first sign in */
  newUser?: string
}

/** @docs https://next-auth.js.org/configuration/options */
export interface NextAuthOptions {
  /** @docs https://next-auth.js.org/configuration/options#theme */
  theme?: 'auto' | 'dark' | 'light'
  /** @docs https://next-auth.js.org/configuration/options#providers */
  providers: Provider[]
  /** @docs https://next-auth.js.org/configuration/options#database */
  database?: any
  /** @docs https://next-auth.js.org/configuration/options#secret */
  secret?: any
  /** @docs https://next-auth.js.org/configuration/options#session */
  session?: any
  /** @docs https://next-auth.js.org/configuration/options#jwt */
  jwt?: any
  /** @docs https://next-auth.js.org/configuration/options#pages */
  pages?: NextAuthPages
  /** @docs https://next-auth.js.org/configuration/options#locales  */
  locales?: {
    /** locale key that matches locale set in next.config.js */
    [key: string]: {
      [key: keyof NextAuthPages | 'email']: {
        [key: string]: string | object
      }
    }
  }
  /**
   * Callbacks are asynchronous functions you can use to control what happens when an action is performed.
   * Callbacks are extremely powerful, especially in scenarios involving JSON Web Tokens as
   * they allow you to implement access controls without a database and
   * to integrate with external databases or APIs.
   * @docs https://next-auth.js.org/configuration/options#callbacks
   */
  callbacks?: CallbacksOptions
  /** @docs https://next-auth.js.org/configuration/options#events */
  events?: EventsOptions
  /** @docs https://next-auth.js.org/configuration/options#adapter */
  adapter?: any
  /** @docs https://next-auth.js.org/configuration/options#debug */
  debug?: boolean
  /** @docs https://next-auth.js.org/configuration/options#usesecurecookies */
  useSecureCookies?: boolean
  /** @docs https://next-auth.js.org/configuration/options#cookies */
  cookies?: CookiesOptions
  /** @docs https://next-auth.js.org/configuration/options#logger */
  logger: LoggerInstance
  /** @docs https://next-auth.js.org/configuration/options#locale */
  locale?: string
}

/** Options that are the same both in internal and user provided options. */
export type NextAuthSharedOptions = 'pages' | 'jwt' | 'events' | 'callbacks' | 'cookies' | 'secret' | 'adapter' | 'theme' | 'debug' | 'logger' | 'locales'

export interface NextAuthInternalOptions extends Pick<NextAuthOptions, NextAuthSharedOptions> {
  pkce?: {
    code_verifier?: string
    /**
     * Could be `"plain"`, but not recommended.
     * We ignore it for now.
     * @spec https://tools.ietf.org/html/rfc7636#section-4.2.
     */
    code_challenge_method?: 'S256'
  }
  provider?: Provider
  baseUrl?: string
  basePath?: string
  action?: string
  csrfToken?: string
}

export interface NextAuthRequest extends NextApiRequest {
  options: NextAuthInternalOptions
}

export interface NextAuthResponse extends NextApiResponse {}

export declare function NextAuthHandler (req: NextAuthRequest, res: NextAuthResponse, options: NextAuthOptions): ReturnType<NextApiHandler>
export declare function NextAuthHandler (options: NextAuthOptions): ReturnType<NextApiHandler>

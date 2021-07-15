import { Profile, TokenSet, User } from "."
import { Awaitable, NextApiRequest } from "./internals/utils"
import { Options as SMTPConnectionOptions } from "nodemailer/lib/smtp-connection"

export type ProviderType = "oauth" | "email" | "credentials"

export interface CommonProviderOptions {
  id: string
  name: string
}

/**
 * OAuth Provider
 */

type ChecksType = "pkce" | "state" | "both" | "none"

/**
 * OAuth provider options
 *
 * [Documentation](https://next-auth.js.org/configuration/providers#oauth-provider-options)
 */
export interface OAuthConfig<P extends Record<string, unknown> = Profile>
  extends CommonProviderOptions {
  authorizationParams?: Record<string, string>
  headers?: Record<string, any>
  type: "oauth"
  version: string
  scope: string
  params: { grant_type: string }
  accessTokenUrl: string
  requestTokenUrl?: string
  authorizationUrl: string
  profileUrl: string
  profile(profile: P, tokens: TokenSet): Awaitable<User & { id: string }>
  checks?: ChecksType | ChecksType[]
  clientId: string
  clientSecret:
    | string
    // TODO: only allow for Apple
    | Record<"appleId" | "teamId" | "privateKey" | "keyId", string>
  idToken?: boolean
  // TODO: only allow for BattleNet
  region?: string
  // TODO: only allow for some
  domain?: string
  // TODO: only allow for Azure Active Directory B2C and FusionAuth
  tenantId?: string
}

export type OAuthProviderType =
  | "Apple"
  | "Atlassian"
  | "Auth0"
  | "AzureAD"
  | "AzureADB2C"
  | "Basecamp"
  | "BattleNet"
  | "Box"
  | "Bungie"
  | "Cognito"
  | "Coinbase"
  | "Discord"
  | "Dropbox"
  | "EVEOnline"
  | "Facebook"
  | "FACEIT"
  | "FortyTwo"
  | "Foursquare"
  | "FusionAuth"
  | "GitHub"
  | "GitLab"
  | "Google"
  | "IdentityServer4"
  | "Instagram"
  | "Kakao"
  | "LINE"
  | "LinkedIn"
  | "Mailchimp"
  | "MailRu"
  | "Medium"
  | "Naver"
  | "Netlify"
  | "Okta"
  | "Osso"
  | "Reddit"
  | "Salesforce"
  | "Slack"
  | "Spotify"
  | "Strava"
  | "Twitch"
  | "Twitter"
  | "VK"
  | "WordPress"
  | "WorkOS"
  | "Yandex"
  | "Zoho"
  | "Zoom"

export type OAuthProvider = (options: Partial<OAuthConfig>) => OAuthConfig

/**
 * Credentials Provider
 */

interface CredentialInput {
  label?: string
  type?: string
  value?: string
  placeholder?: string
}

export type Credentials = Record<string, CredentialInput>

interface CredentialsConfig<C extends Credentials = {}>
  extends CommonProviderOptions {
  type: "credentials"
  credentials: C
  authorize(
    credentials: Record<keyof C, string>,
    req: NextApiRequest
  ): Awaitable<User | null>
}

export type CredentialsProvider = <C extends Record<string, CredentialInput>>(
  options: Partial<CredentialsConfig<C>>
) => CredentialsConfig<C>

export type CredentialsProviderType = "Credentials"

export interface EmailConfig extends CommonProviderOptions {
  type: "email"
  // TODO: Make use of https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
  server: string | SMTPConnectionOptions
  /** @default "NextAuth <no-reply@example.com>" */
  from?: string
  /**
   * How long until the e-mail can be used to log the user in,
   * in seconds. Defaults to 1 day
   * @default 86400
   */
  maxAge?: number
  /**
   * Used to hash the token with before saving to the database.
   * If omitted, `next-auth` will assign one.
   * It is recommended to provide your own secret here.
   */
  secret?: string
  sendVerificationRequest(params: {
    identifier: string
    url: string
    expires: Date
    provider: EmailConfig
    token: string
  }): Awaitable<void>
  /**
   * By default, we are generating a random verification token.
   * You can make it predictable or modify it as you like with this method.
   * @example
   * ```js
   *  Providers.Email({
   *    async generateVerificationToken() {
   *      return "ABC123"
   *    }
   *  })
   * ```
   * [Documentation](https://next-auth.js.org/providers/email#customising-the-verification-token)
   */
  generateVerificationToken?(): Awaitable<string>
}

export type EmailProvider = (options: Partial<EmailConfig>) => EmailConfig

// TODO: Rename to Token provider
// when started working on https://github.com/nextauthjs/next-auth/discussions/1465
export type EmailProviderType = "Email"

export type BuiltInProviders = Record<OAuthProviderType, OAuthProvider> &
  Record<CredentialsProviderType, CredentialsProvider> &
  Record<EmailProviderType, EmailProvider>

export type Provider =
  | OAuthConfig
  | EmailConfig
  | CredentialsConfig
  | ReturnType<BuiltInProviders[keyof BuiltInProviders]>

declare const Providers: BuiltInProviders

export default Providers

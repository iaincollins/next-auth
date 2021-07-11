import { Profile, TokenSet, User } from "."
import { Awaitable, NextApiRequest } from "./internals/utils"
import { Options as SMTPConnectionOptions } from 'nodemailer/lib/smtp-connection'

export type ProviderType = "oauth" | "email" | "credentials"

export interface CommonProviderOptions {
  id: string
  name: string
  type: ProviderType
}

/**
 * OAuth Provider
 */

type ProtectionType = "pkce" | "state" | "both" | "none"

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
  authHeaders?(info: { accessToken: string }): Record<string, string>,
  profile(profile: P, tokens: TokenSet): Awaitable<User & { id: string }>
  protection?: ProtectionType | ProtectionType[]
  clientId: string
  clientSecret:
    | string
    // TODO: only allow for Apple
    | Record<"appleId" | "teamId" | "privateKey" | "keyId", string>
  idToken?: boolean
  /**
   * @deprecated Will be removed in an upcoming major release. Use `protection: ["state"]` instead.
   */
  state?: boolean

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
  | "Yuque"
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

interface CredentialsConfig<C extends Record<string, CredentialInput> = {}>
  extends CommonProviderOptions {
  type: "credentials"
  credentials: C
  authorize(credentials: Record<keyof C, string>, req: NextApiRequest): Awaitable<User | null>
}

export type CredentialsProvider = <C extends Record<string, CredentialInput>>(
  options: Partial<CredentialsConfig<C>>
) => CredentialsConfig<C>

export type CredentialsProviderType = "Credentials"

export type SendVerificationRequest = (params: {
  identifier: string
  url: string
  baseUrl: string
  token: string
  provider: EmailConfig
}) => Awaitable<void>

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
  sendVerificationRequest: SendVerificationRequest
}

export type EmailProvider = (options: Partial<EmailConfig>) => EmailConfig

// TODO: Rename to Token provider
// when started working on https://github.com/nextauthjs/next-auth/discussions/1465
export type EmailProviderType = "Email"

export type Provider = OAuthConfig | EmailConfig | CredentialsConfig

export type BuiltInProviders = Record<OAuthProviderType, OAuthProvider> &
  Record<CredentialsProviderType, CredentialsProvider> &
  Record<EmailProviderType, EmailProvider>

export type AppProviders = Array<
  Provider | ReturnType<BuiltInProviders[keyof BuiltInProviders]>
>

export interface AppProvider extends CommonProviderOptions {
  signinUrl: string
  callbackUrl: string
}

declare const Providers: BuiltInProviders

export default Providers

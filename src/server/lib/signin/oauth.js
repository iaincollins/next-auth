import { openidClient } from "../oauth/client"
import { oAuth1Client } from "../oauth/client-legacy"
import { createState } from "../oauth/state-handler"
import { createPKCE } from "../oauth/pkce-handler"

/**
 * @param {import("types/internals").NextAuthRequest} req
 * @param {import("types/internals").NextAuthResponse} res
 */
export default async function getAuthorizationUrl(req, res) {
  const { logger } = req.options
  /** @type {import("types/providers").OAuthConfig} */
  const provider = req.options.provider
  const params = {
    scope: provider.scope,
    ...provider.params,
    ...req.query,
  }

  // Handle OAuth v1.x
  if (provider.version?.startsWith("1.")) {
    try {
      const tokens = await oAuth1Client.getOAuthRequestToken(params)
      const url = `${provider.authorizationUrl}?${new URLSearchParams({
        oauth_token: tokens.oauth_token,
        oauth_token_secret: tokens.oauth_token_secret,
        ...tokens.params,
      })}`
      logger.debug("GET_AUTHORIZATION_URL", { url })
      return url
    } catch (error) {
      logger.error("GET_AUTHORIZATION_URL_ERROR", error)
      throw error
    }
  }

  // TODO: authorizationParams vs params. What's the difference?
  const client = await openidClient(req.options)
  const pkce = await createPKCE(req, res)
  return client.authorizationUrl({
    ...params,
    ...pkce,
    state: createState(req),
  })
}

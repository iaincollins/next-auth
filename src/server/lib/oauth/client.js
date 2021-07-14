import { Issuer } from "openid-client"

/**
 * NOTE: We can add auto discovery of the provider's endpoint
 * that requires only one endpoint to be specified by the user.
 * Check out `Issuer.discover`
 *
 * Client supporting OAuth 2.x and OIDC
 * @param {import("types/internals").AppOptions} options
 */
export async function openidClient({ provider }) {
  const issuer = new Issuer({
    issuer: `https://${provider.domain}`,
    authorization_endpoint: provider.authorizationUrl,
    userinfo_endpoint: provider.profileUrl,
    token_endpoint: provider.accessTokenUrl,
    jwks_uri: `https://${provider.domain}/.well-known/jwks.json`,
  })

  const client = new issuer.Client({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uris: [provider.callbackUrl],
  })

  return client
}

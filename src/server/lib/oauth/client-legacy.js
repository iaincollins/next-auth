// This is kept around for being backwards compatible with OAuth 1.0 providers.
// We have the intentions to provide only minor fixes for this in the future.

import { OAuth } from "oauth"

/**
 * Client supporting OAuth 1.x
 * @param {import("types/internals").AppOptions} options
 */
export async function oAuth1Client({ provider }) {
  const oauth1Client = new OAuth(
    provider.requestTokenUrl,
    provider.accessTokenUrl,
    provider.clientId,
    provider.clientSecret,
    provider.version || "1.0",
    provider.callbackUrl,
    provider.encoding || "HMAC-SHA1"
  )

  // Promisify get()  for OAuth1
  const originalGet = oauth1Client.get.bind(oauth1Client)
  oauth1Client.get = (...args) => {
    return new Promise((resolve, reject) => {
      originalGet(...args, (error, result) => {
        if (error) {
          return reject(error)
        }
        resolve(result)
      })
    })
  }
  // Promisify getOAuth1AccessToken()  for OAuth1
  const originalGetOAuth1AccessToken =
    oauth1Client.getOAuthAccessToken.bind(oauth1Client)
  oauth1Client.getOAuthAccessToken = (...args) => {
    return new Promise((resolve, reject) => {
      originalGetOAuth1AccessToken(
        ...args,
        (error, oauth_token, oauth_token_secret, params) => {
          if (error) {
            return reject(error)
          }

          resolve({
            // TODO: Remove, this is only kept for backward compativility
            // These are not in the OAuth 1.x spec
            accessToken: oauth_token,
            refreshToken: oauth_token_secret,
            results: params,

            oauth_token,
            oauth_token_secret,
            params,
          })
        }
      )
    })
  }

  const originalGetOAuthRequestToken =
    oauth1Client.getOAuthRequestToken.bind(oauth1Client)
  oauth1Client.getOAuthRequestToken = (params = {}) => {
    return new Promise((resolve, reject) => {
      originalGetOAuthRequestToken(
        params,
        (error, oauth_token, oauth_token_secret, params) => {
          if (error) {
            return reject(error)
          }
          resolve({ oauth_token, oauth_token_secret, params })
        }
      )
    })
  }
  return oauth1Client
}

import { OAuth, OAuth2 } from 'oauth'
import querystring from 'querystring'
import logger from '../../../lib/logger'
import { sign as jwtSign } from 'jsonwebtoken'

/**
 * @TODO Refactor to remove dependancy on 'oauth' package
 * It is already quite monkey patched, we don't use all the features and and it
 * would be easier to maintain if all the code was native to next-auth.
 * @param {import("types/providers").OAuthConfig} provider
 */
export default function oAuthClient (provider) {
  if (provider.version?.startsWith('2.')) {
    // Handle OAuth v2.x
    const authorizationUrl = new URL(provider.authorizationUrl)
    const basePath = authorizationUrl.origin
    const authorizePath = authorizationUrl.pathname
    const accessTokenPath = new URL(provider.accessTokenUrl).pathname
    const oauth2Client = new OAuth2(
      provider.clientId,
      provider.clientSecret,
      basePath,
      authorizePath,
      accessTokenPath,
      provider.headers
    )
    oauth2Client.getOAuthAccessToken = getOAuth2AccessToken
    oauth2Client.get = getOAuth2
    return oauth2Client
  }
  // Handle OAuth v1.x
  const oauth1Client = new OAuth(
    provider.requestTokenUrl,
    provider.accessTokenUrl,
    provider.clientId,
    provider.clientSecret,
    provider.version || '1.0',
    provider.callbackUrl,
    provider.encoding || 'HMAC-SHA1'
  )

  // Promisify get() and getOAuth2AccessToken() for OAuth1
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
  const originalGetOAuth1AccessToken = oauth1Client.getOAuthAccessToken.bind(oauth1Client)
  oauth1Client.getOAuthAccessToken = (...args) => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line camelcase
      originalGetOAuth1AccessToken(...args, (error, oauth_token, oauth_token_secret, params) => {
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
          params
        })
      })
    })
  }

  const originalGetOAuthRequestToken = oauth1Client.getOAuthRequestToken.bind(oauth1Client)
  oauth1Client.getOAuthRequestToken = (params = {}) => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line camelcase
      originalGetOAuthRequestToken(params, (error, oauth_token, oauth_token_secret, params) => {
        if (error) {
          return reject(error)
        }
        resolve({ oauth_token, oauth_token_secret, params })
      })
    })
  }
  return oauth1Client
}

/**
 * @TODO Refactor monkey patching in OAuth2.getOAuthAccessToken() and OAuth2.get()
 * These methods have been forked from `node-oauth` to fix bugs; it may make
 * sense to migrate all the methods we need from node-oauth to nexth-auth (with
 * appropriate credit) to make it easier to maintain and address issues as they
 * come up, as the node-oauth package does not seem to be actively maintained.
 */

/**
 * Ported from https://github.com/ciaranj/node-oauth/blob/a7f8a1e21c362eb4ed2039431fb9ac2ae749f26a/lib/oauth2.js
 * @param {string} code
 * @param {import("types/providers").OAuthConfig} provider
 * @param {string | undefined} codeVerifier
 */
async function getOAuth2AccessToken (code, provider, codeVerifier) {
  const url = provider.accessTokenUrl
  const params = { ...provider.params }
  const headers = { ...provider.headers }
  const codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code'

  if (!params[codeParam]) { params[codeParam] = code }

  if (!params.client_id) { params.client_id = provider.clientId }

  // For Apple the client secret must be generated on-the-fly.
  // Using the properties in clientSecret to create a JWT.
  if (provider.id === 'apple' && typeof provider.clientSecret === 'object') {
    const { keyId, teamId, privateKey } = provider.clientSecret
    const clientSecret = jwtSign({
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (86400 * 180), // 6 months
      aud: 'https://appleid.apple.com',
      sub: provider.clientId
    },
    // Automatically convert \\n into \n if found in private key. If the key
    // is passed in an environment variable \n can get escaped as \\n
    privateKey.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', keyid: keyId }
    )
    params.client_secret = clientSecret
  } else {
    params.client_secret = provider.clientSecret
  }

  if (!params.redirect_uri) { params.redirect_uri = provider.callbackUrl }

  if (!headers['Content-Type']) { headers['Content-Type'] = 'application/x-www-form-urlencoded' }
  // Added as a fix to accomodate change in Twitch OAuth API
  if (!headers['Client-ID']) { headers['Client-ID'] = provider.clientId }
  // Added as a fix for Reddit Authentication
  if (provider.id === 'reddit') {
    headers.Authorization = 'Basic ' + Buffer.from((provider.clientId + ':' + provider.clientSecret)).toString('base64')
  }

  if (provider.id === 'identity-server4' && !headers.Authorization) {
    headers.Authorization = `Bearer ${code}`
  }

  if (provider.protection.includes('pkce')) {
    params.code_verifier = codeVerifier
  }

  const postData = querystring.stringify(params)

  return new Promise((resolve, reject) => {
    this._request(
      'POST',
      url,
      headers,
      postData,
      null,
      (error, data, response) => {
        if (error) {
          logger.error('OAUTH_GET_ACCESS_TOKEN_ERROR', error, data, response)
          return reject(error)
        }

        let raw
        try {
          // As of http://tools.ietf.org/html/draft-ietf-oauth-v2-07
          // responses should be in JSON
          raw = JSON.parse(data)
        } catch {
          // However both Facebook + Github currently use rev05 of the spec  and neither
          // seem to specify a content-type correctly in their response headers. :(
          // Clients of these services suffer a minor performance cost.
          raw = querystring.parse(data)
        }

        let accessToken
        if (provider.id === 'slack') {
          const { ok, error } = raw
          if (!ok) {
            return reject(error)
          }

          accessToken = raw.authed_user.access_token
        } else {
          accessToken = raw.access_token
        }

        resolve({
          accessToken,
          accessTokenExpires: null,
          refreshToken: raw.refresh_token,
          idToken: raw.id_token,
          ...raw
        })
      }
    )
  })
}

/**
 * Ported from https://github.com/ciaranj/node-oauth/blob/a7f8a1e21c362eb4ed2039431fb9ac2ae749f26a/lib/oauth2.js
 *
 * 18/08/2020 @robertcraigie added results parameter to pass data to an optional request preparer.
 * e.g. see providers/bungie
 * @param {import("types/providers").OAuthConfig} provider
 * @param {string} accessToken
 * @param {any} results
 */
async function getOAuth2 (provider, accessToken, results) {
  let url = provider.profileUrl
  let httpMethod = 'GET'
  const headers = { ...provider.headers }

  if (this._useAuthorizationHeaderForGET) {
    headers.Authorization = this.buildAuthHeader(accessToken)

    // Mail.ru & vk.com require 'access_token' as URL request parameter
    if (['mailru', 'vk'].includes(provider.id)) {
      const safeAccessTokenURL = new URL(url)
      safeAccessTokenURL.searchParams.append('access_token', accessToken)
      url = safeAccessTokenURL.href
    }

    // This line is required for Twitch
    if (provider.id === 'twitch') {
      headers['Client-ID'] = provider.clientId
    }
    accessToken = null
  }

  if (provider.id === 'bungie') {
    url = prepareProfileUrl({ provider, url, results })
  }

  /** Dropbox requires POST instead of GET
   * Read more: https://www.dropbox.com/developers/reference/auth-types#user
   */
  if (provider.id === 'dropbox') {
    httpMethod = 'POST'
  }

  const request = (httpMethod, url, headers, accessToken) =>
    new Promise((resolve, reject) => {
      this._request(
        httpMethod,
        url,
        headers,
        null,
        accessToken,
        (error, profileData, response) => {
          if (error) {
            return reject(error)
          }

          if (response.statusCode === 302 && response.headers.location) {
            return resolve(
              request(
                httpMethod,
                response.headers.location,
                headers,
                accessToken
              )
            )
          }

          return resolve(profileData)
        }
      )
    })

  return request(httpMethod, url, headers, accessToken)
}

/** Bungie needs special handling */
function prepareProfileUrl ({ provider, url, results }) {
  if (!results.membership_id) {
    // internal error
    // @TODO: handle better
    throw new Error('Expected membership_id to be passed.')
  }

  if (!provider.headers?.['X-API-Key']) {
    throw new Error('The Bungie provider requires the X-API-Key option to be present in "headers".')
  }

  return url.replace('{membershipId}', results.membership_id)
}

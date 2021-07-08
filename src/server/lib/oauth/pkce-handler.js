import pkceChallenge from 'pkce-challenge'
import * as cookie from '../cookie'
import jwt from '../../../lib/jwt'
import logger from '../../../lib/logger'
import { OAuthCallbackError } from '../../../lib/errors'

const PKCE_LENGTH = 64
const PKCE_CODE_CHALLENGE_METHOD = 'S256' // can be 'plain', not recommended https://tools.ietf.org/html/rfc7636#section-4.2
const PKCE_MAX_AGE = 60 * 15 // 15 minutes in seconds

/**
 * Adds `code_verifier` to `req.options.pkce`, and removes the corresponding cookie
 * @param {import("types/internals").NextAuthRequest} req
 * @param {import("types/internals").NextAuthResponse} res
 */
export async function handleCallback (req, res) {
  const { cookies, provider, baseUrl, basePath } = req.options
  try {
    // Provider does not support PKCE, nothing to do.
    if (!provider.protection?.includes('pkce')) {
      return
    }

    if (!(cookies.pkceCodeVerifier.name in req.cookies)) {
      throw new OAuthCallbackError('The code_verifier cookie was not found.')
    }
    const pkce = await jwt.decode({
      ...req.options.jwt,
      token: req.cookies[cookies.pkceCodeVerifier.name],
      maxAge: PKCE_MAX_AGE,
      encryption: true
    })
    req.options.pkce = pkce
    logger.debug('OAUTH_CALLBACK_PROTECTION', 'Read PKCE verifier from cookie', {
      code_verifier: pkce.code_verifier,
      pkceLength: PKCE_LENGTH,
      method: PKCE_CODE_CHALLENGE_METHOD
    })
    // remove PKCE after it has been used
    cookie.set(res, cookies.pkceCodeVerifier.name, "", { 
      ...cookies.pkceCodeVerifier.options,
      maxAge: 0 
    })
  } catch (error) {
    logger.error('CALLBACK_OAUTH_ERROR', error)
    return res.redirect(`${baseUrl}${basePath}/error?error=OAuthCallback`)
  }
}

/**
 * Adds `code_challenge` and `code_challenge_method` to `req.options.pkce`.
 * @param {import("types/internals").NextAuthRequest} req
 * @param {import("types/internals").NextAuthResponse} res
 */
export async function handleSignin (req, res) {
  const { cookies, provider, baseUrl, basePath } = req.options
  try {
    if (!provider.protection?.includes('pkce')) { // Provider does not support PKCE, nothing to do.
      return
    }
    // Started login flow, add generated pkce to req.options and (encrypted) code_verifier to a cookie
    const pkce = pkceChallenge(PKCE_LENGTH)
    logger.debug('OAUTH_SIGNIN_PROTECTION', 'Created PKCE challenge/verifier', {
      ...pkce,
      pkceLength: PKCE_LENGTH,
      method: PKCE_CODE_CHALLENGE_METHOD
    })

    provider.authorizationParams = {
      ...provider.authorizationParams,
      code_challenge: pkce.code_challenge,
      code_challenge_method: PKCE_CODE_CHALLENGE_METHOD
    }

    const encryptedCodeVerifier = await jwt.encode({
      ...req.options.jwt,
      maxAge: PKCE_MAX_AGE,
      token: { code_verifier: pkce.code_verifier },
      encryption: true
    })

    const cookieExpires = new Date()
    cookieExpires.setTime(cookieExpires.getTime() + (PKCE_MAX_AGE * 1000))
    cookie.set(res, cookies.pkceCodeVerifier.name, encryptedCodeVerifier, {
      expires: cookieExpires.toISOString(),
      ...cookies.pkceCodeVerifier.options
    })
    logger.debug('OAUTH_SIGNIN_PROTECTION', 'Created PKCE code_verifier saved in cookie')
  } catch (error) {
    logger.error('SIGNIN_OAUTH_ERROR', error)
    return res.redirect(`${baseUrl}${basePath}/error?error=OAuthSignin`)
  }
}

export default { handleSignin, handleCallback }

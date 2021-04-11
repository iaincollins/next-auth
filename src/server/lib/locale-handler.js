import * as cookie from '../lib/cookie'

/**
 * Get locale based on body / query param / cookie
 */
export default function localeHandler (req, res, cookieOptions) {
  const { body, query } = req
  // get locale from body, query or cookie
  const localeCookieValue = req.cookies[cookieOptions.locale.name] || null
  const locale = body.locale || query.locale || localeCookieValue || null

  // Save locale in a cookie so that can be used for subsequent requests in signin/signout/callback flow
  if (locale && (locale !== localeCookieValue)) {
    cookie.set(res, cookieOptions.locale.name, locale, cookieOptions.locale.options)
  }

  return locale
}

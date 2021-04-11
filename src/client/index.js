// Note about signIn() and signOut() methods:
//
// On signIn() and signOut() we pass 'json: true' to request a response in JSON
// instead of HTTP as redirect URLs on other domains are not returned to
// requests made using the fetch API in the browser, and we need to ask the API
// to return the response as a JSON object (the end point still defaults to
// returning an HTTP response with a redirect for non-JavaScript clients).
//
// We use HTTP POST requests with CSRF Tokens to protect against CSRF attacks.

import { useState, useEffect, useContext, createContext, createElement } from 'react'
import _logger, { proxyLogger } from '../lib/logger'
import parseUrl from '../lib/parse-url'
import { useRouter } from 'next/router'

// This behaviour mirrors the default behaviour for getting the site name that
// happens server side in server/index.js
// 1. An empty value is legitimate when the code is being invoked client side as
//    relative URLs are valid in that context and so defaults to empty.
// 2. When invoked server side the value is picked up from an environment
//    variable and defaults to 'http://localhost:3000'.
/** @type {import(".").NextAuthConfig} */
const __NEXTAUTH = {
  baseUrl: parseUrl(process.env.NEXTAUTH_URL || process.env.VERCEL_URL).baseUrl,
  basePath: parseUrl(process.env.NEXTAUTH_URL).basePath,
  baseUrlServer: parseUrl(process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL).baseUrl,
  basePathServer: parseUrl(process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL).basePath,
  keepAlive: 0,
  clientMaxAge: 0,
  locale: undefined,
  // Properties starting with _ are used for tracking internal app state
  _clientLastSync: 0,
  _clientSyncTimer: null,
  _eventListenersAdded: false,
  _clientSession: undefined,
  _getSession: () => {}
}

const logger = proxyLogger(_logger, __NEXTAUTH.basePath)

const broadcast = BroadcastChannel()

// Add event listners on load
if (typeof window !== 'undefined' && !__NEXTAUTH._eventListenersAdded) {
  __NEXTAUTH._eventListenersAdded = true
  // Listen for storage events and update session if event fired from
  // another window (but suppress firing another event to avoid a loop)
  // Fetch new session data but tell it to not to fire another event to
  // avoid an infinite loop.
  // Note: We could pass session data through and do something like
  // `setData(message.data)` but that can cause problems depending
  // on how the session object is being used in the client; it is
  // more robust to have each window/tab fetch it's own copy of the
  // session object rather than share it across instances.
  broadcast.receive(() => __NEXTAUTH._getSession({ event: 'storage' }))

  // Listen for document visibility change events and
  // if visibility of the document changes, re-fetch the session.
  document.addEventListener('visibilitychange', () => {
    !document.hidden && __NEXTAUTH._getSession({ event: 'visibilitychange' })
  }, false)
}

// Context to store session data globally
const SessionContext = createContext()

/**
 * React Hook that gives you access
 * to the logged in user's session data.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#usesession)
 * @type {import(".").UseSession}
 */
export function useSession (session) {
  const context = useContext(SessionContext)
  if (context) return context
  return _useSessionHook(session)
}

function _useSessionHook (session) {
  const [data, setData] = useState(session)
  const [loading, setLoading] = useState(!data)

  useEffect(() => {
    __NEXTAUTH._getSession = async ({ event = null } = {}) => {
      try {
        const triggredByEvent = event !== null
        const triggeredByStorageEvent = event === 'storage'

        const clientMaxAge = __NEXTAUTH.clientMaxAge
        const clientLastSync = parseInt(__NEXTAUTH._clientLastSync)
        const currentTime = _now()
        const clientSession = __NEXTAUTH._clientSession

        // Updates triggered by a storage event *always* trigger an update and we
        // always update if we don't have any value for the current session state.
        if (!triggeredByStorageEvent && clientSession !== undefined) {
          if (clientMaxAge === 0 && triggredByEvent !== true) {
            // If there is no time defined for when a session should be considered
            // stale, then it's okay to use the value we have until an event is
            // triggered which updates it.
            return
          } else if (clientMaxAge > 0 && clientSession === null) {
            // If the client doesn't have a session then we don't need to call
            // the server to check if it does (if they have signed in via another
            // tab or window that will come through as a triggeredByStorageEvent
            // event and will skip this logic)
            return
          } else if (clientMaxAge > 0 && currentTime < (clientLastSync + clientMaxAge)) {
            // If the session freshness is within clientMaxAge then don't request
            // it again on this call (avoids too many invokations).
            return
          }
        }

        if (clientSession === undefined) { __NEXTAUTH._clientSession = null }

        // Update clientLastSync before making response to avoid repeated
        // invokations that would otherwise be triggered while we are still
        // waiting for a response.
        __NEXTAUTH._clientLastSync = _now()

        // If this call was invoked via a storage event (i.e. another window) then
        // tell getSession not to trigger an event when it calls to avoid an
        // infinate loop.
        const newClientSessionData = await getSession({
          triggerEvent: !triggeredByStorageEvent
        })

        // Save session state internally, just so we can track that we've checked
        // if a session exists at least once.
        __NEXTAUTH._clientSession = newClientSessionData

        setData(newClientSessionData)
        setLoading(false)
      } catch (error) {
        logger.error('CLIENT_USE_SESSION_ERROR', error)
        setLoading(false)
      }
    }

    __NEXTAUTH._getSession()
  })

  return [data, loading]
}

/**
 * Can be called client or server side to return a session asynchronously.
 * It calls `/api/auth/session` and returns a promise with a session object,
 * or null if no session exists.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#getsession)
 * @type {import(".").GetSession}
 */
export async function getSession (ctx) {
  const session = await _fetchData('session', ctx)
  if (ctx?.triggerEvent ?? true) {
    broadcast.post({ event: 'session', data: { trigger: 'getSession' } })
  }
  return session
}

/**
 * Returns the current Cross Site Request Forgery Token (CSRF Token)
 * required to make POST requests (e.g. for signing in and signing out).
 * You likely only need to use this if you are not using the built-in
 * `signIn()` and `signOut()` methods.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#getcsrftoken)
 * @type {import(".").GetCsrfToken}
 */
async function getCsrfToken (ctx) {
  return (await _fetchData('csrf', ctx))?.csrfToken
}

/**
 * It calls `/api/auth/providers` and returns
 * a list of the currently configured authentication providers.
 * It can be useful if you are creating a dynamic custom sign in page.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#getproviders)
 * @type {import(".").GetProviders}
 */
export async function getProviders () {
  return _fetchData('providers')
}

/**
 * Client-side method to initiate a signin flow
 * or send the user to the signin page listing all possible providers.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#signin)
 * @type {import(".").SignIn}
 */
export async function signIn (provider, options = {}, authorizationParams = {}) {
  const {
    callbackUrl = window.location,
    redirect = true
  } = options

  const baseUrl = _apiBaseUrl()
  const providers = await getProviders()

  // Redirect to sign in page if no valid provider specified
  if (!(provider in providers)) {
    const params = new URLSearchParams({
      callbackUrl
    })
    if (__NEXTAUTH.locale) params.append('locale', __NEXTAUTH.locale)
    // If Provider not recognized, redirect to sign in page
    window.location = `${baseUrl}/signin?${params.toString()}`
    return
  }
  const isCredentials = providers[provider].type === 'credentials'
  const isEmail = providers[provider].type === 'email'
  const canRedirectBeDisabled = isCredentials || isEmail

  const signInUrl = isCredentials
    ? `${baseUrl}/callback/${provider}`
    : `${baseUrl}/signin/${provider}`

  // If is any other provider type, POST to provider URL with CSRF Token,
  // callback URL and any other parameters supplied.
  const fetchOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      ...options,
      csrfToken: await getCsrfToken(),
      callbackUrl,
      locale: __NEXTAUTH.locale,
      json: true
    })
  }
  const _signInUrl = `${signInUrl}?${new URLSearchParams(authorizationParams)}`
  const res = await fetch(_signInUrl, fetchOptions)
  const data = await res.json()
  if (redirect || !canRedirectBeDisabled) {
    const url = data.url ?? callbackUrl
    window.location = url
    // If url contains a hash, the browser does not reload the page. We reload manually
    if (url.includes('#')) window.location.reload()

    return
  }

  const error = new URL(data.url).searchParams.get('error')

  if (res.ok) {
    await __NEXTAUTH._getSession({ event: 'storage' })
  }

  return {
    error,
    status: res.status,
    ok: res.ok,
    url: error ? null : data.url
  }
}

/**
 * Signs the user out, by removing the session cookie.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#signout)
 * @type {import(".").SignOut}
 */
export async function signOut (options = {}) {
  const {
    callbackUrl = window.location,
    redirect = true
  } = options
  const baseUrl = _apiBaseUrl()
  const fetchOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      csrfToken: await getCsrfToken(),
      callbackUrl,
      json: true
    })
  }
  const res = await fetch(`${baseUrl}/signout`, fetchOptions)
  const data = await res.json()
  broadcast.post({ event: 'session', data: { trigger: 'signout' } })
  if (redirect) {
    const url = data.url ?? callbackUrl
    window.location = url
    // If url contains a hash, the browser does not reload the page. We reload manually
    if (url.includes('#')) window.location.reload()
    return
  }

  await __NEXTAUTH._getSession({ event: 'storage' })

  return data
}

// Method to set options. The documented way is to use the provider, but this
// method is being left in as an alternative, that will be helpful if/when we
// expose a vanilla JavaScript version that doesn't depend on React.
/** @type {import(".").SetOptions} */
export function setOptions ({ baseUrl, basePath, clientMaxAge, keepAlive, locale } = {}) {
  if (baseUrl) __NEXTAUTH.baseUrl = baseUrl
  if (basePath) __NEXTAUTH.basePath = basePath
  if (clientMaxAge) __NEXTAUTH.clientMaxAge = clientMaxAge
  if (keepAlive) {
    __NEXTAUTH.keepAlive = keepAlive
    if (typeof window === 'undefined') return

    // Clear existing timer (if there is one)
    if (__NEXTAUTH._clientSyncTimer !== null) {
      clearTimeout(__NEXTAUTH._clientSyncTimer)
    }

    // Set next timer to trigger in number of seconds
    __NEXTAUTH._clientSyncTimer = setTimeout(async () => {
      // Only invoke keepalive when a session exists
      if (!__NEXTAUTH._clientSession) return
      await __NEXTAUTH._getSession({ event: 'timer' })
    }, keepAlive * 1000)
  }
  if (locale) {
    __NEXTAUTH.locale = locale
  }
}

/**
 * Provider to wrap the app in to make session data available globally.
 * Can also be used to throttle the number of requests to the endpoint
 * `/api/auth/session`.
 *
 * [Documentation](https://next-auth.js.org/getting-started/client#provider)
 * @type {import(".").Provider}
 */
export function Provider ({ children, session, options }) {
  // inject locale to options for it to be available later on during auth
  const { locale } = useRouter()
  setOptions({ locale, ...options })
  return createElement(
    SessionContext.Provider,
    { value: useSession(session) },
    children
  )
}

/**
 * If passed 'appContext' via getInitialProps() in _app.js
 * then get the req object from ctx and use that for the
 * req value to allow _fetchData to
 * work seemlessly in getInitialProps() on server side
 * pages *and* in _app.js.
 */
async function _fetchData (path, { ctx, req = ctx?.req } = {}) {
  try {
    const baseUrl = await _apiBaseUrl()
    const options = req ? { headers: { cookie: req.headers.cookie } } : {}
    const res = await fetch(`${baseUrl}/${path}`, options)
    const data = await res.json()
    return Object.keys(data).length > 0 ? data : null // Return null if data empty
  } catch (error) {
    logger.error('CLIENT_FETCH_ERROR', path, error)
    return null
  }
}

function _apiBaseUrl () {
  if (typeof window === 'undefined') {
    // NEXTAUTH_URL should always be set explicitly to support server side calls - log warning if not set
    if (!process.env.NEXTAUTH_URL) {
      logger.warn('NEXTAUTH_URL', 'NEXTAUTH_URL environment variable not set')
    }

    // Return absolute path when called server side
    return `${__NEXTAUTH.baseUrlServer}${__NEXTAUTH.basePathServer}`
  }
  // Return relative path when called client side
  return __NEXTAUTH.basePath
}

/** Returns the number of seconds elapsed since January 1, 1970 00:00:00 UTC. */
function _now () {
  return Math.floor(Date.now() / 1000)
}

/**
 * Inspired by [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
 * Only not using it directly, because Safari does not support it.
 *
 * https://caniuse.com/?search=broadcastchannel
 */
function BroadcastChannel (name = 'nextauth.message') {
  return {
    /**
     * Get notified by other tabs/windows.
     * @param {(message: import(".").BroadcastMessage) => void} onReceive
     */
    receive (onReceive) {
      if (typeof window === 'undefined') return
      window.addEventListener('storage', async (event) => {
        if (event.key !== name) return
        /** @type {import(".").BroadcastMessage} */
        const message = JSON.parse(event.newValue)
        if (message?.event !== 'session' || !message?.data) return

        onReceive(message)
      })
    },
    /** Notify other tabs/windows. */
    post (message) {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(name,
        JSON.stringify({ ...message, timestamp: _now() })
      )
    }
  }
}

export default {
  getSession,
  getCsrfToken,
  getProviders,
  useSession,
  signIn,
  signOut,
  Provider,
  /* Deprecated / unsupported features below this line */
  // Use setOptions() set options globally in the app.
  setOptions,
  // Some methods are exported with more than one name. This provides some
  // flexibility over how they can be invoked and backwards compatibility
  // with earlier releases.
  options: setOptions,
  session: getSession,
  providers: getProviders,
  csrfToken: getCsrfToken,
  signin: signIn,
  signout: signOut
}

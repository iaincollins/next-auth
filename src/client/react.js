// Note about signIn() and signOut() methods:
//
// On signIn() and signOut() we pass 'json: true' to request a response in JSON
// instead of HTTP as redirect URLs on other domains are not returned to
// requests made using the fetch API in the browser, and we need to ask the API
// to return the response as a JSON object (the end point still defaults to
// returning an HTTP response with a redirect for non-JavaScript clients).
//
// We use HTTP POST requests with CSRF Tokens to protect against CSRF attacks.

// eslint-disable-next-line no-use-before-define
import * as React from "react"
import _logger, { proxyLogger } from "../lib/logger"
import parseUrl from "../lib/parse-url"

// This behaviour mirrors the default behaviour for getting the site name that
// happens server side in server/index.js
// 1. An empty value is legitimate when the code is being invoked client side as
//    relative URLs are valid in that context and so defaults to empty.
// 2. When invoked server side the value is picked up from an environment
//    variable and defaults to 'http://localhost:3000'.
/** @type {import("types/internals/react").NextAuthConfig} */
const __NEXTAUTH = {
  baseUrl: parseUrl(process.env.NEXTAUTH_URL || process.env.VERCEL_URL).baseUrl,
  basePath: parseUrl(process.env.NEXTAUTH_URL).basePath,
  baseUrlServer: parseUrl(
    process.env.NEXTAUTH_URL_INTERNAL ||
      process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL
  ).baseUrl,
  basePathServer: parseUrl(
    process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL
  ).basePath,
  _lastSync: 0,
  _session: undefined,
  _getSession: () => {},
}

const broadcast = BroadcastChannel()

const logger = proxyLogger(_logger, __NEXTAUTH.basePath)

/** @type {import("types/internals/react").SessionContext} */
const SessionContext = React.createContext()

export function useSession(options = {}) {
  const value = React.useContext(SessionContext)

  if (process.env.NODE_ENV !== "production" && !value) {
    throw new Error("useSession must be wrapped in a SessionProvider")
  }

  const { required, onUnauthenticated } = options

  const requiredAndNotLoading = required && value.status === "unauthenticated"

  React.useEffect(() => {
    if (requiredAndNotLoading) {
      const url = `/api/auth/signin?${new URLSearchParams({
        error: "SessionRequired",
        callbackUrl: window.location.href,
      })}`
      if (onUnauthenticated) onUnauthenticated()
      else window.location.replace(url)
    }
  }, [requiredAndNotLoading, onUnauthenticated])

  if (requiredAndNotLoading) {
    return { data: value.data, status: "loading" }
  }

  return value
}

export async function getSession(ctx) {
  const session = await _fetchData("session", ctx)
  if (ctx?.broadcast ?? true) {
    broadcast.post({ event: "session", data: { trigger: "getSession" } })
  }
  return session
}

export async function getCsrfToken(ctx) {
  const response = await _fetchData("csrf", ctx)
  return response?.csrfToken
}

export async function getProviders() {
  return await _fetchData("providers")
}

export async function signIn(provider, options = {}, authorizationParams = {}) {
  const { callbackUrl = window.location.href, redirect = true } = options

  const baseUrl = _apiBaseUrl()
  const providers = await getProviders()

  if (!providers) {
    return window.location.replace(`${baseUrl}/error`)
  }

  if (!(provider in providers)) {
    return window.location.replace(
      `${baseUrl}/signin?${new URLSearchParams({ callbackUrl })}`
    )
  }

  const isCredentials = providers[provider].type === "credentials"
  const isEmail = providers[provider].type === "email"
  const isSupportingReturn = isCredentials || isEmail

  const signInUrl = `${baseUrl}/${
    isCredentials ? "callback" : "signin"
  }/${provider}`

  const _signInUrl = `${signInUrl}?${new URLSearchParams(authorizationParams)}`

  const res = await fetch(_signInUrl, {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      ...options,
      csrfToken: await getCsrfToken(),
      callbackUrl,
      json: true,
    }),
  })

  const data = await res.json()

  if (redirect || !isSupportingReturn) {
    const url = data.url ?? callbackUrl
    window.location.replace(url)
    // If url contains a hash, the browser does not reload the page. We reload manually
    if (url.includes("#")) window.location.reload()
    return
  }

  const error = new URL(data.url).searchParams.get("error")

  if (res.ok) {
    await __NEXTAUTH._getSession({ event: "storage" })
  }

  return {
    error,
    status: res.status,
    ok: res.ok,
    url: error ? null : data.url,
  }
}

export async function signOut(options = {}) {
  const { callbackUrl = window.location.href, redirect = true } = options
  const baseUrl = _apiBaseUrl()
  const fetchOptions = {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      csrfToken: await getCsrfToken(),
      callbackUrl,
      json: true,
    }),
  }
  const res = await fetch(`${baseUrl}/signout`, fetchOptions)
  const data = await res.json()
  broadcast.post({ event: "session", data: { trigger: "signout" } })

  if (redirect) {
    const url = data.url ?? callbackUrl
    window.location.replace(url)
    // If url contains a hash, the browser does not reload the page. We reload manually
    if (url.includes("#")) window.location.reload()
    return
  }

  await __NEXTAUTH._getSession({ event: "storage" })

  return data
}

/** @param {import("types/react-client").SessionProviderProps} props */
export function SessionProvider(props) {
  const { children, baseUrl, basePath, staleTime = 0 } = props

  if (baseUrl) __NEXTAUTH.baseUrl = baseUrl
  if (basePath) __NEXTAUTH.basePath = basePath

  /**
   * If session was `null`, there was an attempt to fetch it,
   * but it failed, but we still treat it as a valid initial value.
   */
  const hasInitialSession = props.session !== undefined

  /** If session was passed, initialize as already synced */
  __NEXTAUTH._lastSync = hasInitialSession ? _now() : 0

  const [session, setSession] = React.useState(() => {
    if (hasInitialSession) __NEXTAUTH._session = props.session
    return props.session
  })

  /** If session was passed, initialize as not loading */
  const [loading, setLoading] = React.useState(!hasInitialSession)

  React.useEffect(() => {
    __NEXTAUTH._getSession = async ({ event } = {}) => {
      try {
        const storageEvent = event === "storage"
        // We should always update if we don't have a client session yet
        // or if there are events from other tabs/windows
        if (storageEvent || __NEXTAUTH._session === undefined) {
          __NEXTAUTH._lastSync = _now()
          __NEXTAUTH._session = await getSession({
            broadcast: !storageEvent,
          })
          setSession(__NEXTAUTH._session)
          return
        }
        if (
          // If there is no time defined for when a session should be considered
          // stale, then it's okay to use the value we have until an event is
          // triggered which updates it
          (staleTime === 0 && !event) ||
          // If the client doesn't have a session then we don't need to call
          // the server to check if it does (if they have signed in via another
          // tab or window that will come through as a "storage" event
          // event anyway)
          (staleTime > 0 && __NEXTAUTH._session === null) ||
          // Bail out early if the client session is not stale yet
          (staleTime > 0 && _now() < __NEXTAUTH._lastSync + staleTime)
        ) {
          return
        }

        // An event or session staleness occurred, update the client session.
        __NEXTAUTH._lastSync = _now()
        __NEXTAUTH._session = await getSession()
        setSession(__NEXTAUTH._session)
      } catch (error) {
        logger.error("CLIENT_SESSION_ERROR", error)
      } finally {
        setLoading(false)
      }
    }

    __NEXTAUTH._getSession()
  }, [staleTime])

  React.useEffect(() => {
    // Listen for storage events and update session if event fired from
    // another window (but suppress firing another event to avoid a loop)
    // Fetch new session data but tell it to not to fire another event to
    // avoid an infinite loop.
    // Note: We could pass session data through and do something like
    // `setData(message.data)` but that can cause problems depending
    // on how the session object is being used in the client; it is
    // more robust to have each window/tab fetch it's own copy of the
    // session object rather than share it across instances.
    const unsubscribe = broadcast.receive(
      async () => await __NEXTAUTH._getSession({ event: "storage" })
    )

    return () => unsubscribe()
  }, [])

  React.useEffect(() => {
    // Listen for when the page is visible, if the user switches tabs
    // and makes our tab visible again, re-fetch the session.
    const visibilityHandler = () => {
      if (document.visibilityState === "visible")
        __NEXTAUTH._getSession({ event: "visibilitychange" })
    }

    document.addEventListener("visibilitychange", visibilityHandler, false)
    return () =>
      document.removeEventListener("visibilitychange", visibilityHandler, false)
  }, [])

  React.useEffect(() => {
    const { refetchInterval } = props
    // Set up polling
    if (refetchInterval) {
      const refetchIntervalTimer = setInterval(async () => {
        if (__NEXTAUTH._session) {
          await __NEXTAUTH._getSession({ event: "poll" })
        }
      }, refetchInterval * 1000)
      return () => clearInterval(refetchIntervalTimer)
    }
  }, [props.refetchInterval])

  const value = React.useMemo(
    () => ({
      data: session,
      status: loading
        ? "loading"
        : session
        ? "authenticated"
        : "unauthenticated",
    }),
    [session, loading]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

/**
 * If passed 'appContext' via getInitialProps() in _app.js
 * then get the req object from ctx and use that for the
 * req value to allow _fetchData to
 * work seemlessly in getInitialProps() on server side
 * pages *and* in _app.js.
 */
async function _fetchData(path, { ctx, req = ctx?.req } = {}) {
  try {
    const options = req ? { headers: { cookie: req.headers.cookie } } : {}
    const res = await fetch(`${_apiBaseUrl()}/${path}`, options)
    const data = await res.json()
    if (!res.ok) throw data
    return Object.keys(data).length > 0 ? data : null // Return null if data empty
  } catch (error) {
    logger.error("CLIENT_FETCH_ERROR", {
      error,
      path,
      ...(req ? { header: req.headers } : {}),
    })
    return null
  }
}

function _apiBaseUrl() {
  if (typeof window === "undefined") {
    // Return absolute path when called server side
    return `${__NEXTAUTH.baseUrlServer}${__NEXTAUTH.basePathServer}`
  }
  // Return relative path when called client side
  return __NEXTAUTH.basePath
}

/** Returns the number of seconds elapsed since January 1, 1970 00:00:00 UTC. */
function _now() {
  return Math.floor(Date.now() / 1000)
}

/**
 * Inspired by [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
 * Only not using it directly, because Safari does not support it.
 *
 * https://caniuse.com/?search=broadcastchannel
 */
function BroadcastChannel(name = "nextauth.message") {
  return {
    /**
     * Get notified by other tabs/windows.
     * @param {(message: import("types/internals/react").BroadcastMessage) => void} onReceive
     */
    receive(onReceive) {
      const handler = (event) => {
        if (event.key !== name) return
        /** @type {import("types/internals/react").BroadcastMessage} */
        const message = JSON.parse(event.newValue)
        if (message?.event !== "session" || !message?.data) return

        onReceive(message)
      }
      window.addEventListener("storage", handler)
      return () => window.removeEventListener("storage", handler)
    },
    /** Notify other tabs/windows. */
    post(message) {
      if (typeof window === "undefined") return
      localStorage.setItem(
        name,
        JSON.stringify({ ...message, timestamp: _now() })
      )
    },
  }
}

/// Note: fetch() is built in to Next.js 9.4
//
// Note about signIn() and signOut() methods:
//
// On signIn() and signOut() we pass 'json: true' to request a response in JSON
// instead of HTTP as redirect URLs on other domains are not returned to
// requests made using the fetch API in the browser, and we need to ask the API
// to return the response as a JSON object (the end point still defaults to
// returning an HTTP response with a redirect for non-JavaScript clients).
//
// We use HTTP POST requests with CSRF Tokens to protect against CSRF attacks.

/* global fetch:false */
import { useState, useEffect, useContext, createContext, createElement } from 'react'
import logger from '../lib/logger'
import parseUrl from '../lib/parse-url'
import { Session, ProviderInternalConfig } from '../interfaces'
import { NextPageContext } from 'next'

interface NextAuthClient {
  baseUrl: string,
  basePath: string,
  keepAlive: number, // 0 == disabled (don't send); 60 == send every 60 seconds
  clientMaxAge: number, // 0 == disabled (only use cache); 60 == sync if last checked > 60 seconds ago
  // Properties starting with _ are used for tracking internal app state
  _clientLastSync: number | string, // used for timestamp since last synced (in seconds)
  _clientSyncTimer: null | any, // stores timer for poll interval
  _eventListenersAdded: boolean, // tracks if event listeners have been added,
  _clientSession?: any, // stores last session response from hook,
  // Generate a unique ID to make it possible to identify when a message
  // was sent from this tab/window so it can be ignored to avoid event loops.
  _clientId: string,
  // Used to store to function export by getSession() hook
  _getSession: (data: any) => Promise<any> | any
}

// This behavior mirrors the default behavior for getting the site name that
// happens server side in server/index.js
// 1. An empty value is legitimate when the code is being invoked client side as
//    relative URLs are valid in that context and so defaults to empty.
// 2. When invoked server side the value is picked up from an environment
//    variable and defaults to 'http://localhost:3000'.
const __NEXTAUTH: NextAuthClient = {
  baseUrl: parseUrl(process.env.NEXTAUTH_URL || process.env.VERCEL_URL).baseUrl,
  basePath: parseUrl(process.env.NEXTAUTH_URL).basePath,
  keepAlive: 0, // 0 == disabled (don't send); 60 == send every 60 seconds
  clientMaxAge: 0, // 0 == disabled (only use cache); 60 == sync if last checked > 60 seconds ago
  // Properties starting with _ are used for tracking internal app state
  _clientLastSync: 0, // used for timestamp since last synced (in seconds)
  _clientSyncTimer: null, // stores timer for poll interval
  _eventListenersAdded: false, // tracks if event listeners have been added,
  _clientSession: undefined, // stores last session response from hook,
  // Generate a unique ID to make it possible to identify when a message
  // was sent from this tab/window so it can be ignored to avoid event loops.
  _clientId: Math.random().toString(36).substring(2) + Date.now().toString(36),
  // Used to store to function export by getSession() hook
  _getSession: () => {}
}

// Add event listeners on load
if (typeof window !== 'undefined') {
  if (__NEXTAUTH._eventListenersAdded === false) {
    __NEXTAUTH._eventListenersAdded = true

    // Listen for storage events and update session if event fired from
    // another window (but suppress firing another event to avoid a loop)
    window.addEventListener('storage', async (event) => {
      if (event.key === 'nextauth.message') {
        const message = JSON.parse(event.newValue)
        if (message.event && message.event === 'session' && message.data) {
          // Ignore storage events fired from the same window that created them
          if (__NEXTAUTH._clientId === message.clientId) {
            return
          }

          // Fetch new session data but pass 'true' to it not to fire an event to
          // avoid an infinite loop.
          //
          // Note: We could pass session data through and do something like
          // `setData(message.data)` but that can cause problems depending
          // on how the session object is being used in the client; it is
          // more robust to have each window/tab fetch it's own copy of the
          // session object rather than share it across instances.
          await __NEXTAUTH._getSession({ event: 'storage' })
        }
      }
    })

    // Listen for window focus/blur events
    window.addEventListener('focus', async (event) => __NEXTAUTH._getSession({ event: 'focus' }))
    window.addEventListener('blur', async (event) => __NEXTAUTH._getSession({ event: 'blur' }))
  }
}

type  MutableClientOptions =  Partial<Pick<NextAuthClient, "baseUrl" | "basePath" | "clientMaxAge" | "keepAlive">>;
// Method to set options. The documented way is to use the provider, but this
// method is being left in as an alternative, that will be helpful if/when we
// expose a vanilla JavaScript version that doesn't depend on React.
const setOptions = ({
  baseUrl,
  basePath,
  clientMaxAge,
  keepAlive
}: MutableClientOptions = {}) => {
  if (baseUrl) { __NEXTAUTH.baseUrl = baseUrl }
  if (basePath) { __NEXTAUTH.basePath = basePath }
  if (clientMaxAge) { __NEXTAUTH.clientMaxAge = clientMaxAge }
  if (keepAlive) {
    __NEXTAUTH.keepAlive = keepAlive

    if (typeof window !== 'undefined' && keepAlive > 0) {
      // Clear existing timer (if there is one)
      if (__NEXTAUTH._clientSyncTimer !== null) { clearTimeout(__NEXTAUTH._clientSyncTimer) }

      // Set next timer to trigger in number of seconds
      __NEXTAUTH._clientSyncTimer = setTimeout(async () => {
        // Only invoke keepalive when a session exists
        if (__NEXTAUTH._clientSession) {
          await __NEXTAUTH._getSession({ event: 'timer' })
        }
      }, keepAlive * 1000)
    }
  }
}

interface BaseHookArgs {
  req?: NextPageContext["req"],
  ctx?: NextPageContext,
}

interface GetSessionArgs extends BaseHookArgs {
  triggerEvent?: boolean
}
// Universal method (client + server)
const getSession = async ({ req, ctx, triggerEvent = true }: GetSessionArgs = {} as any): Promise<Session | null> => {
  // If passed 'appContext' via getInitialProps() in _app.js then get the req
  // object from ctx and use that for the req value to allow getSession() to
  // work seamlessly in getInitialProps() on server side pages *and* in _app.js.
  if (!req && ctx && ctx.req) { req = ctx.req }

  const baseUrl = _apiBaseUrl()
  const fetchOptions = req ? { headers: { cookie: req.headers.cookie } } : {}
  const session = await _fetchData<Session>(`${baseUrl}/session`, fetchOptions)
  if (triggerEvent) {
    _sendMessage({ event: 'session', data: { trigger: 'getSession' } })
  }
  return session
}

interface GetCsrfTokenArgs extends BaseHookArgs  {}

// Universal method (client + server)
const getCsrfToken = async ({ req, ctx }: GetCsrfTokenArgs = {}) => {
  // If passed 'appContext' via getInitialProps() in _app.js then get the req
  // object from ctx and use that for the req value to allow getCsrfToken() to
  // work seamlessly in getInitialProps() on server side pages *and* in _app.js.
  if (!req && ctx && ctx.req) { req = ctx.req }

  const baseUrl = _apiBaseUrl()
  const fetchOptions = req ? { headers: { cookie: req.headers.cookie } } : {}
  const data = await _fetchData<{csrfToken: string}>(`${baseUrl}/csrf`, fetchOptions)
  return data && data.csrfToken ? data.csrfToken : null
}

// Universal method (client + server); does not require request headers
const getProviders = async () => {
  const baseUrl = _apiBaseUrl()
  return _fetchData<Record<string,ProviderInternalConfig>>(`${baseUrl}/providers`)
}

// Context to store session data globally
const SessionContext = createContext(undefined)

// Client side method
const useSession = (session?: Session) => {
  // Try to use context if we can
  const value = useContext(SessionContext)

  // If we have no Provider in the tree, call the actual hook
  if (value === undefined) {
    return _useSessionHook(session)
  }

  return value
}

// Internal hook for getting session from the api.
const _useSessionHook = (session?: Session) => {
  const [data, setData] = useState(session)
  const [loading, setLoading] = useState(true)
  const _getSession = async ({ event = null } = {}) => {
    try {
      const triggeredByEvent = (event !== null)
      const triggeredByStorageEvent = !!((event && event === 'storage'))

      const clientMaxAge = __NEXTAUTH.clientMaxAge
      const clientLastSync = parseInt(__NEXTAUTH._clientLastSync as any)
      const currentTime = Math.floor(new Date().getTime() / 1000)
      const clientSession = __NEXTAUTH._clientSession

      // Updates triggered by a storage event *always* trigger an update and we
      // always update if we don't have any value for the current session state.
      if (triggeredByStorageEvent === false && clientSession !== undefined) {
        if (clientMaxAge === 0 && triggeredByEvent !== true) {
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
          // it again on this call (avoids too many invocations).
          return
        }
      }

      if (clientSession === undefined) { __NEXTAUTH._clientSession = null }

      // Update clientLastSync before making response to avoid repeated
      // invocations that would otherwise be triggered while we are still
      // waiting for a response.
      __NEXTAUTH._clientLastSync = Math.floor(new Date().getTime() / 1000)

      // If this call was invoked via a storage event (i.e. another window) then
      // tell getSession not to trigger an event when it calls to avoid an
      // infinite loop.
      const triggerEvent = (triggeredByStorageEvent === false)
      const newClientSessionData = await getSession({ triggerEvent })

      // Save session state internally, just so we can track that we've checked
      // if a session exists at least once.
      __NEXTAUTH._clientSession = newClientSessionData

      setData(newClientSessionData)
      setLoading(false)
    } catch (error) {
      logger.error('CLIENT_USE_SESSION_ERROR', error)
    }
  }

  __NEXTAUTH._getSession = _getSession

  useEffect(() => {
    _getSession()
  })
  return [data, loading]
}

interface SignInArgs {
  callbackUrl?: string,
  [key: string]: any
}
// Client side method
const signIn = async (provider, args: SignInArgs = {}) => {
  const baseUrl = _apiBaseUrl()
  const callbackUrl = (args && args.callbackUrl) ? args.callbackUrl : window.location.href
  const providers = await getProviders()

  // Redirect to sign in page if no valid provider specified
  if (!provider || !providers[provider]) {
    // If Provider not recognized, redirect to sign in page
    window.location.href = `${baseUrl}/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
  } else {
    const signInUrl = (providers[provider].type === 'credentials')
      ? `${baseUrl}/callback/${provider}`
      : `${baseUrl}/signin/${provider}`
    // If is any other provider type, POST to provider URL with CSRF Token,
    // callback URL and any other parameters supplied.
    const fetchOptions = {
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: _encodedForm({
        ...args,
        csrfToken: await getCsrfToken(),
        callbackUrl: callbackUrl,
        json: true
      })
    }
    const res = await fetch(signInUrl, fetchOptions)
    const data = await res.json()
    window.location = data.url ? data.url : callbackUrl
  }
}

interface SignOutArgs {
  callbackUrl?: string;
}

// Client side method
const signOut = async (args: SignOutArgs = {}) => {
  const callbackUrl = (args && args.callbackUrl) ? args.callbackUrl : window.location

  const baseUrl = _apiBaseUrl()
  const fetchOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: _encodedForm({
      csrfToken: await getCsrfToken(),
      callbackUrl: callbackUrl,
      json: true
    })
  }
  const res = await fetch(`${baseUrl}/signout`, fetchOptions)
  const data = await res.json()
  _sendMessage({ event: 'session', data: { trigger: 'signout' } })
  window.location = data.url ? data.url : callbackUrl
}

interface ProviderProps {
  session: Session,
  options?: MutableClientOptions
}
// Provider to wrap the app in to make session data available globally
const Provider: React.FunctionComponent<ProviderProps> = ({ children, session, options }) => {
  setOptions(options)
  return createElement(SessionContext.Provider, { value: useSession(session) }, children) as any;
}

// note: don't include {} in TData, since empty objects are filtered out
const _fetchData = async <TData extends {} = {}>(url, options = {}): Promise<TData | null> => {
  try {
    const res = await fetch(url, options)
    const data: unknown = await res.json()
    if (Object.keys(data).length > 0) {
      return data as TData;
    }
    // Return null if data empty
    return null;
  } catch (error) {
    logger.error('CLIENT_FETCH_ERROR', url, error)
    return null;
  }
}

const _apiBaseUrl = () => {
  if (typeof window === 'undefined') {
    // NEXTAUTH_URL should always be set explicitly to support server side calls - log warning if not set
    if (!process.env.NEXTAUTH_URL) { logger.warn('NEXTAUTH_URL', 'NEXTAUTH_URL environment variable not set') }

    // Return absolute path when called server side
    return `${__NEXTAUTH.baseUrl}${__NEXTAUTH.basePath}`
  } else {
    // Return relative path when called client side
    return __NEXTAUTH.basePath
  }
}

const _encodedForm = (formData) => {
  return Object.keys(formData).map((key) => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(formData[key])
  }).join('&')
}

const _sendMessage = (message) => {
  if (typeof localStorage !== 'undefined') {
    const timestamp = Math.floor(new Date().getTime() / 1000)
    localStorage.setItem('nextauth.message', JSON.stringify({ ...message, clientId: __NEXTAUTH._clientId, timestamp })) // eslint-disable-line
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

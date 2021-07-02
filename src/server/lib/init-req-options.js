import adapters from '../../adapters'
import jwt from '../../lib/jwt'
import parseUrl from '../../lib/parse-url'
import logger, { setLogger } from '../../lib/logger'
import * as cookie from './cookie'
import * as defaultEvents from './default-events'
import * as defaultCallbacks from './default-callbacks'
import parseProviders from './providers'
import createSecret from './create-secret'

/**
 * Compute options shared between `NextAuthHandler` and `getServerSide` 
 * functions and attach them to the request object. 
 * 
 * All options are included except the ones that are specific to the 
 * `NextAuthHandler` (action, provider, theme, pages). 
 * 
 * Maybe we need to move other specific `NextAuthHandler` options like callbacks, events, pkce, ...
 */
function initReqOptions(req, userOptions) {
  // Prevent recomputing options when multiple `getServerSide` calls 
  // are made in the same `getServerSideProps` function.
  if (req.options) {
    return
  }

  if (userOptions.logger) {
    setLogger(userOptions.logger)
  }
  
  // If debug enabled, set ENV VAR so that logger logs debug messages
  if (userOptions.debug) {
    process.env._NEXTAUTH_DEBUG = true
  }

  // @todo refactor all existing references to baseUrl and basePath
  const { basePath, baseUrl } = parseUrl(
    process.env.NEXTAUTH_URL || process.env.VERCEL_URL,
  )

  const cookies = {
    ...cookie.defaultCookies(
      userOptions.useSecureCookies || baseUrl.startsWith('https://'),
    ),
    // Allow user cookie options to override any cookie settings above
    ...userOptions.cookies,
  }

  const secret = createSecret({ userOptions, basePath, baseUrl })

  const providers = parseProviders({
    providers: userOptions.providers,
    baseUrl,
    basePath,
  })

  const maxAge = 30 * 24 * 60 * 60 // Sessions expire after 30 days of being idle

  // Parse database / adapter
  // If adapter is provided, use it (advanced usage, overrides database)
  // If database URI or config object is provided, use it (simple usage)
  const adapter =
    userOptions.adapter ??
    (userOptions.database && adapters.Default(userOptions.database))

  // User provided options are overriden by other options,
  // except for the options with special handling above
  req.options = {
    debug: false,
    // Custom options override defaults
    ...userOptions,
    // These computed settings can have values in userOptions but we override them
    // and are request-specific.
    adapter,
    baseUrl,
    basePath,
    cookies,
    secret,
    providers,
    // Session options
    session: {
      jwt: !adapter, // If no adapter specified, force use of JSON Web Tokens (stateless)
      maxAge,
      updateAge: 24 * 60 * 60, // Sessions updated only if session is greater than this value (0 = always, 24*60*60 = every 24 hours)
      ...userOptions.session,
    },
    // JWT options
    jwt: {
      secret, // Use application secret if no keys specified
      maxAge, // same as session maxAge,
      encode: jwt.encode,
      decode: jwt.decode,
      ...userOptions.jwt,
    },
    // Event messages
    events: {
      ...defaultEvents,
      ...userOptions.events,
    },
    // Callback functions
    callbacks: {
      ...defaultCallbacks,
      ...userOptions.callbacks,
    },
    pkce: {},
    logger,
  }
}

export default initReqOptions

import logger from "../lib/logger"
import * as routes from "./routes"
import renderPage from "./pages"
import initReqOptions from "./lib/init-req-options"
import callbackUrlHandler from "./lib/callback-url-handler"
import extendRes from "./lib/extend-res"
import csrfTokenHandler from "./lib/csrf-token-handler"
import session from "./lib/session"
import * as pkce from "./lib/oauth/pkce-handler"
import * as state from "./lib/oauth/state-handler"

// To work properly in production with OAuth providers the NEXTAUTH_URL
// environment variable must be set.
if (!process.env.NEXTAUTH_URL) {
  logger.warn("NEXTAUTH_URL", "NEXTAUTH_URL environment variable not set")
}

/**
 * @param {import("next").NextPageContext} ctx
 * @param {import("types").NextAuthOptions} userOptions
 */
 export async function getServerSession(ctx, userOptions) {
  const { req, res } = ctx

  initReqOptions(req, userOptions)

  return session(req, res)
}

/**
 * @param {import("next").NextPageContext} ctx
 * @param {import("types").NextAuthOptions} userOptions
 */
export async function getServerProviders(ctx, userOptions) {
  const { req } = ctx

  initReqOptions(req, userOptions)

  return req.options.providers.reduce(
    (acc, { id, name, type, signinUrl, callbackUrl }) => {
      acc[id] = { id, name, type, signinUrl, callbackUrl }
      return acc
    },
    {}
  )
}

/**
 * @param {import("next").NextApiRequest} req
 * @param {import("next").NextApiResponse} res
 * @param {import("types").NextAuthOptions} userOptions
 */
async function NextAuthHandler(req, res, userOptions) {
  // To the best of my knowledge, we need to return a promise here
  // to avoid early termination of calls to the serverless function
  // (and then return that promise when we are done) - eslint
  // complains but I'm not sure there is another way to do this.
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    initReqOptions(req, userOptions)

    extendRes(req, res, resolve)

    initReqOptions(req, res, userOptions)

    if (!req.query.nextauth) {
      const error =
        "Cannot find [...nextauth].js in pages/api/auth. Make sure the filename is written correctly."

      logger.error("MISSING_NEXTAUTH_API_ROUTE_ERROR", error)
      return res.status(500).end(`Error: ${error}`)
    }

    const {
      nextauth,
      action = nextauth[0],
      providerId = nextauth[1],
      error = nextauth[1],
    } = req.query

    const provider = req.options.providers.find(({ id }) => id === providerId)

    // Protection only works on OAuth 2.x providers
    // TODO:
    // - rename to `checks` in 4.x, so it is similar to `openid-client`
    // - stop supporting `protection` as string
    // - remove `state` property
    if (provider?.type === "oauth" && provider.version?.startsWith("2")) {
      // Priority: (protection array > protection string) > state > default
      if (provider.protection) {
        provider.protection = Array.isArray(provider.protection)
          ? provider.protection
          : [provider.protection]
      } else if (provider.state !== undefined) {
        provider.protection = [provider.state ? "state" : "none"]
      } else {
        // Default to state, as we did in 3.1
        // REVIEW: should we use "pkce" or "none" as default?
        provider.protection = ["state"]
      }
    }

    // Attach additional options needed for the auth flow.
    req.options = {
      pages: {},
      theme: "auto",
      ...req.options,
      action,
      provider,
    }

    csrfTokenHandler(req, res)
    await callbackUrlHandler(req, res)

    const render = renderPage(req, res)
    const { pages, baseUrl, basePath } = req.options

    if (req.method === "GET") {
      switch (action) {
        case "providers":
          return routes.providers(req, res)
        case "session":
          return routes.session(req, res)
        case "csrf":
          return res.json({ csrfToken: req.options.csrfToken })
        case "signin":
          if (pages.signIn) {
            let signinUrl = `${pages.signIn}${
              pages.signIn.includes("?") ? "&" : "?"
            }callbackUrl=${req.options.callbackUrl}`
            if (error) {
              signinUrl = `${signinUrl}&error=${error}`
            }
            return res.redirect(signinUrl)
          }

          return render.signin()
        case "signout":
          if (pages.signOut) return res.redirect(pages.signOut)

          return render.signout()
        case "callback":
          if (provider) {
            if (await pkce.handleCallback(req, res)) return
            if (await state.handleCallback(req, res)) return
            return routes.callback(req, res)
          }
          break
        case "verify-request":
          if (pages.verifyRequest) {
            return res.redirect(pages.verifyRequest)
          }
          return render.verifyRequest()
        case "error":
          if (pages.error) {
            return res.redirect(
              `${pages.error}${
                pages.error.includes("?") ? "&" : "?"
              }error=${error}`
            )
          }

          // These error messages are displayed in line on the sign in page
          if (
            [
              "Signin",
              "OAuthSignin",
              "OAuthCallback",
              "OAuthCreateAccount",
              "EmailCreateAccount",
              "Callback",
              "OAuthAccountNotLinked",
              "EmailSignin",
              "CredentialsSignin",
            ].includes(error)
          ) {
            return res.redirect(`${baseUrl}${basePath}/signin?error=${error}`)
          }

          return render.error({ error })
        default:
      }
    } else if (req.method === "POST") {
      switch (action) {
        case "signin":
          // Verified CSRF Token required for all sign in routes
          if (req.options.csrfTokenVerified && provider) {
            if (await pkce.handleSignin(req, res)) return
            if (await state.handleSignin(req, res)) return
            return routes.signin(req, res)
          }

          return res.redirect(`${baseUrl}${basePath}/signin?csrf=true`)
        case "signout":
          // Verified CSRF Token required for signout
          if (req.options.csrfTokenVerified) {
            return routes.signout(req, res)
          }
          return res.redirect(`${baseUrl}${basePath}/signout?csrf=true`)
        case "callback":
          if (provider) {
            // Verified CSRF Token required for credentials providers only
            if (
              provider.type === "credentials" &&
              !req.options.csrfTokenVerified
            ) {
              return res.redirect(`${baseUrl}${basePath}/signin?csrf=true`)
            }

            if (await pkce.handleCallback(req, res)) return
            if (await state.handleCallback(req, res)) return
            return routes.callback(req, res)
          }
          break
        case "_log":
          if (userOptions.logger) {
            try {
              const {
                code = "CLIENT_ERROR",
                level = "error",
                message = "[]",
              } = req.body

              logger[level](code, ...JSON.parse(message))
            } catch (error) {
              // If logging itself failed...
              logger.error("LOGGER_ERROR", error)
            }
          }
          return res.end()
        default:
      }
    }
    return res
      .status(400)
      .end(`Error: HTTP ${req.method} is not supported for ${req.url}`)
  })
}

/** Tha main entry point to next-auth */
export default function NextAuth(...args) {
  if (args.length === 1) {
    return (req, res) => NextAuthHandler(req, res, args[0])
  }

  return NextAuthHandler(...args)
}

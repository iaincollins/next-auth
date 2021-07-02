import * as cookie from "./cookie"
import dispatchEvent from "./dispatch-event"
import adapterErrorHandler from "../../adapters/error-handler"

/**
 * Return a session object (without any private fields)
 * for Single Page App clients
 * @param {import("types/internals").NextAuthRequest} req
 * @param {import("types/internals").NextAuthResponse} res
 */
export default async function session(req, res) {
  const { cookies, adapter, jwt, events, callbacks, logger } = req.options
  const useJwtSession = req.options.session.jwt
  const sessionMaxAge = req.options.session.maxAge
  const sessionToken = req.cookies[cookies.sessionToken.name]

  if (!sessionToken) {
    return null
  }

  let response = {}
  if (useJwtSession) {
    try {
      // Decrypt and verify token
      const decodedJwt = await jwt.decode({ ...jwt, token: sessionToken })

      // Generate new session expiry date
      const sessionExpiresDate = new Date()
      sessionExpiresDate.setTime(
        sessionExpiresDate.getTime() + sessionMaxAge * 1000
      )
      const sessionExpires = sessionExpiresDate.toISOString()

      // By default, only exposes a limited subset of information to the client
      // as needed for presentation purposes (e.g. "you are logged in as…").
      const defaultSessionPayload = {
        user: {
          name: decodedJwt.name || null,
          email: decodedJwt.email || null,
          image: decodedJwt.picture || null,
        },
        expires: sessionExpires,
      }

      // Pass Session and JSON Web Token through to the session callback
      const jwtPayload = await callbacks.jwt(decodedJwt)
      const sessionPayload = await callbacks.session(
        defaultSessionPayload,
        jwtPayload
      )

      // Return session payload as response
      response = sessionPayload

      // Refresh JWT expiry by re-signing it, with an updated expiry date
      const newEncodedJwt = await jwt.encode({ ...jwt, token: jwtPayload })

      // Set cookie, to also update expiry date on cookie
      cookie.set(res, cookies.sessionToken.name, newEncodedJwt, {
        expires: sessionExpires,
        ...cookies.sessionToken.options,
      })

      await dispatchEvent(events.session, {
        session: sessionPayload,
        jwt: jwtPayload,
      })
    } catch (error) {
      // If JWT not verifiable, make sure the cookie for it is removed and return empty object
      logger.error("JWT_SESSION_ERROR", error)
      cookie.set(res, cookies.sessionToken.name, "", {
        ...cookies.sessionToken.options,
        maxAge: 0,
      })
    }
  } else {
    try {
      const { getUser, getSession, updateSession } = adapterErrorHandler(
        await adapter.getAdapter(req.options),
        logger
      )
      const session = await getSession(sessionToken)
      if (session) {
        // Trigger update to session object to update session expiry
        await updateSession(session)

        const user = await getUser(session.userId)

        // By default, only exposes a limited subset of information to the client
        // as needed for presentation purposes (e.g. "you are logged in as…").
        const defaultSessionPayload = {
          user: {
            name: user.name,
            email: user.email,
            image: user.image,
          },
          accessToken: session.accessToken,
          expires: session.expires,
        }

        // Pass Session through to the session callback
        const sessionPayload = await callbacks.session(
          defaultSessionPayload,
          user
        )

        // Return session payload as response
        response = sessionPayload

        // Set cookie again to update expiry
        cookie.set(res, cookies.sessionToken.name, sessionToken, {
          expires: session.expires,
          ...cookies.sessionToken.options,
        })

        await dispatchEvent(events.session, { session: sessionPayload })
      } else if (sessionToken) {
        // If sessionToken was found set but it's not valid for a session then
        // remove the sessionToken cookie from browser.
        cookie.set(res, cookies.sessionToken.name, "", {
          ...cookies.sessionToken.options,
          maxAge: 0,
        })
      }
    } catch (error) {
      logger.error("SESSION_ERROR", error)
    }
  }

  return response
}

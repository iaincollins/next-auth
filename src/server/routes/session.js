import * as cookie from "../lib/cookie"

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
    return res.json({})
  }

  let response = {}
  if (useJwtSession) {
    try {
      // Decrypt and verify token
      const decodedToken = await jwt.decode({ ...jwt, token: sessionToken })

      // Generate new session expiry date
      const sessionExpiresDate = new Date()
      sessionExpiresDate.setTime(
        sessionExpiresDate.getTime() + sessionMaxAge * 1000
      )
      const sessionExpires = sessionExpiresDate.toISOString()

      // By default, only exposes a limited subset of information to the client
      // as needed for presentation purposes (e.g. "you are logged in as...").
      const defaultSession = {
        user: {
          name: decodedToken?.name,
          email: decodedToken?.email,
          image: decodedToken?.picture,
        },
        expires: sessionExpires,
      }

      // Pass Session and JSON Web Token through to the session callback
      const token = await callbacks.jwt({ token: decodedToken })
      const session = await callbacks.session({
        session: defaultSession,
        token,
      })

      // Return session payload as response
      response = session

      // Refresh JWT expiry by re-signing it, with an updated expiry date
      const newToken = await jwt.encode({ ...jwt, token })

      // Set cookie, to also update expiry date on cookie
      cookie.set(res, cookies.sessionToken.name, newToken, {
        expires: sessionExpires,
        ...cookies.sessionToken.options,
      })

      await events.session?.({ session, token })
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
      const { getUser, getSession, updateSession } = adapter
      const session = await getSession(sessionToken)
      if (session) {
        // Trigger update to session object to update session expiry
        await updateSession(session)

        const user = await getUser(session.userId)

        // By default, only exposes a limited subset of information to the client
        // as needed for presentation purposes (e.g. "you are logged in as...").
        const defaultSession = {
          user: {
            name: user?.name,
            email: user?.email,
            image: user?.image,
          },
          accessToken: session.accessToken,
          expires: session.expires.toISOString(),
        }

        // Pass Session through to the session callback
        const sessionPayload = await callbacks.session({
          session: defaultSession,
          user,
        })

        // Return session payload as response
        response = sessionPayload

        // Set cookie again to update expiry
        cookie.set(res, cookies.sessionToken.name, sessionToken, {
          expires: session.expires,
          ...cookies.sessionToken.options,
        })

        await events.session?.({ session: sessionPayload })
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

  res.json(response)
}

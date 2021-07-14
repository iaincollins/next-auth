import oAuthCallback from "../lib/oauth/callback"
import callbackHandler from "../lib/callback-handler"
import * as cookie from "../lib/cookie"
import adapterErrorHandler from "../../adapters/error-handler"

/**
 * Handle callbacks from login services
 * @type {import("types/internals").NextAuthApiHandler}
 */
export default async function callback(req, res) {
  const {
    provider,
    adapter,
    baseUrl,
    basePath,
    secret,
    cookies,
    callbackUrl,
    pages,
    jwt,
    events,
    callbacks,
    session: { jwt: useJwtSession, maxAge: sessionMaxAge },
    logger,
  } = req.options

  // Get session ID (if set)
  const sessionToken = req.cookies?.[cookies.sessionToken.name] ?? null

  if (provider.type === "oauth") {
    try {
      const { profile, account, OAuthProfile } = await oAuthCallback(req, res)
      try {
        // Make it easier to debug when adding a new provider
        logger.debug("OAUTH_CALLBACK_RESPONSE", {
          profile,
          account,
          OAuthProfile,
        })

        // If we don't have a profile object then either something went wrong
        // or the user cancelled signing in. We don't know which, so we just
        // direct the user to the signin page for now. We could do something
        // else in future.
        //
        // Note: In oAuthCallback an error is logged with debug info, so it
        // should at least be visible to developers what happened if it is an
        // error with the provider.
        if (!profile) {
          return res.redirect(`${baseUrl}${basePath}/signin`)
        }

        // Check if user is allowed to sign in
        // Attempt to get Profile from OAuth provider details before invoking
        // signIn callback - but if no user object is returned, that is fine
        // (that just means it's a new user signing in for the first time).
        let userOrProfile = profile
        if (adapter) {
          const { getUserByProviderAccountId } = adapterErrorHandler(
            await adapter.getAdapter(req.options),
            logger
          )
          const userFromProviderAccountId = await getUserByProviderAccountId(
            account.provider,
            account.id
          )
          if (userFromProviderAccountId) {
            userOrProfile = userFromProviderAccountId
          }
        }

        try {
          const signInCallbackResponse = await callbacks.signIn({
            user: userOrProfile,
            account,
            profile: OAuthProfile,
          })
          if (!signInCallbackResponse) {
            return res.redirect(
              `${baseUrl}${basePath}/error?error=AccessDenied`
            )
          } else if (typeof signInCallbackResponse === "string") {
            return res.redirect(signInCallbackResponse)
          }
        } catch (error) {
          return res.redirect(
            `${baseUrl}${basePath}/error?error=${encodeURIComponent(
              error.message
            )}`
          )
        }

        // Sign user in
        const { user, session, isNewUser } = await callbackHandler(
          sessionToken,
          profile,
          account,
          req.options
        )

        if (useJwtSession) {
          const defaultToken = {
            name: user.name,
            email: user.email,
            picture: user.image,
            sub: user.id?.toString(),
          }
          const token = await callbacks.jwt({
            token: defaultToken,
            user,
            account,
            profile: OAuthProfile,
            isNewUser,
          })

          // Sign and encrypt token
          const newEncodedJwt = await jwt.encode({ ...jwt, token })

          // Set cookie expiry date
          const cookieExpires = new Date()
          cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000)

          cookie.set(res, cookies.sessionToken.name, newEncodedJwt, {
            expires: cookieExpires.toISOString(),
            ...cookies.sessionToken.options,
          })
        } else {
          // Save Session Token in cookie
          cookie.set(res, cookies.sessionToken.name, session.sessionToken, {
            expires: session.expires || null,
            ...cookies.sessionToken.options,
          })
        }

        await events.signIn({ user, account, profile, isNewUser })

        // Handle first logins on new accounts
        // e.g. option to send users to a new account landing page on initial login
        // Note that the callback URL is preserved, so the journey can still be resumed
        if (isNewUser && pages.newUser) {
          return res.redirect(
            `${pages.newUser}${
              pages.newUser.includes("?") ? "&" : "?"
            }callbackUrl=${encodeURIComponent(callbackUrl)}`
          )
        }

        // Callback URL is already verified at this point, so safe to use if specified
        return res.redirect(callbackUrl || baseUrl)
      } catch (error) {
        if (error.name === "AccountNotLinkedError") {
          // If the email on the account is already linked, but not with this OAuth account
          return res.redirect(
            `${baseUrl}${basePath}/error?error=OAuthAccountNotLinked`
          )
        } else if (error.name === "CreateUserError") {
          return res.redirect(
            `${baseUrl}${basePath}/error?error=OAuthCreateAccount`
          )
        }
        logger.error("OAUTH_CALLBACK_HANDLER_ERROR", error)
        return res.redirect(`${baseUrl}${basePath}/error?error=Callback`)
      }
    } catch (error) {
      if (error.name === "OAuthCallbackError") {
        logger.error("CALLBACK_OAUTH_ERROR", error)
        return res.redirect(`${baseUrl}${basePath}/error?error=OAuthCallback`)
      }
      logger.error("OAUTH_CALLBACK_ERROR", error)
      return res.redirect(`${baseUrl}${basePath}/error?error=Callback`)
    }
  } else if (provider.type === "email") {
    try {
      if (!adapter) {
        logger.error("EMAIL_REQUIRES_ADAPTER_ERROR")
        return res.redirect(`${baseUrl}${basePath}/error?error=Configuration`)
      }

      const {
        getVerificationRequest,
        deleteVerificationRequest,
        getUserByEmail,
      } = adapterErrorHandler(await adapter.getAdapter(req.options), logger)
      const verificationToken = req.query.token
      const email = req.query.email

      // Verify email and verification token exist in database
      const invite = await getVerificationRequest(
        email,
        verificationToken,
        secret,
        provider
      )
      if (!invite) {
        return res.redirect(`${baseUrl}${basePath}/error?error=Verification`)
      }

      // If verification token is valid, delete verification request token from
      // the database so it cannot be used again
      await deleteVerificationRequest(
        email,
        verificationToken,
        secret,
        provider
      )

      // If is an existing user return a user object (otherwise use placeholder)
      const profile = (await getUserByEmail(email)) || { email }
      const account = {
        id: provider.id,
        type: "email",
        providerAccountId: email,
      }

      // Check if user is allowed to sign in
      try {
        const signInCallbackResponse = await callbacks.signIn({
          user: profile,
          account,
          email: { email },
        })
        if (!signInCallbackResponse) {
          return res.redirect(`${baseUrl}${basePath}/error?error=AccessDenied`)
        } else if (typeof signInCallbackResponse === "string") {
          return res.redirect(signInCallbackResponse)
        }
      } catch (error) {
        return res.redirect(
          `${baseUrl}${basePath}/error?error=${encodeURIComponent(
            error.message
          )}`
        )
      }

      // Sign user in
      const { user, session, isNewUser } = await callbackHandler(
        sessionToken,
        profile,
        account,
        req.options
      )

      if (useJwtSession) {
        const defaultToken = {
          name: user.name,
          email: user.email,
          picture: user.image,
          sub: user.id?.toString(),
        }
        const token = await callbacks.jwt({
          token: defaultToken,
          user,
          account,
          profile,
          isNewUser,
        })

        // Sign and encrypt token
        const newEncodedJwt = await jwt.encode({ ...jwt, token })

        // Set cookie expiry date
        const cookieExpires = new Date()
        cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000)

        cookie.set(res, cookies.sessionToken.name, newEncodedJwt, {
          expires: cookieExpires.toISOString(),
          ...cookies.sessionToken.options,
        })
      } else {
        // Save Session Token in cookie
        cookie.set(res, cookies.sessionToken.name, session.sessionToken, {
          expires: session.expires || null,
          ...cookies.sessionToken.options,
        })
      }

      await events.signIn({ user, account, profile, isNewUser })

      // Handle first logins on new accounts
      // e.g. option to send users to a new account landing page on initial login
      // Note that the callback URL is preserved, so the journey can still be resumed
      if (isNewUser && pages.newUser) {
        return res.redirect(
          `${pages.newUser}${
            pages.newUser.includes("?") ? "&" : "?"
          }callbackUrl=${encodeURIComponent(callbackUrl)}`
        )
      }

      // Callback URL is already verified at this point, so safe to use if specified
      return res.redirect(callbackUrl || baseUrl)
    } catch (error) {
      if (error.name === "CreateUserError") {
        return res.redirect(
          `${baseUrl}${basePath}/error?error=EmailCreateAccount`
        )
      }
      logger.error("CALLBACK_EMAIL_ERROR", error)
      return res.redirect(`${baseUrl}${basePath}/error?error=Callback`)
    }
  } else if (provider.type === "credentials" && req.method === "POST") {
    if (!useJwtSession) {
      logger.error(
        "CALLBACK_CREDENTIALS_JWT_ERROR",
        new Error(
          "Signin in with credentials is only supported if JSON Web Tokens are enabled"
        )
      )
      return res
        .status(500)
        .redirect(`${baseUrl}${basePath}/error?error=Configuration`)
    }

    if (!provider.authorize) {
      logger.error(
        "CALLBACK_CREDENTIALS_HANDLER_ERROR",
        new Error(
          "Must define an authorize() handler to use credentials authentication provider"
        )
      )
      return res
        .status(500)
        .redirect(`${baseUrl}${basePath}/error?error=Configuration`)
    }

    const credentials = req.body

    let userObjectReturnedFromAuthorizeHandler
    try {
      userObjectReturnedFromAuthorizeHandler = await provider.authorize(
        credentials,
        { ...req, options: {}, cookies: {} }
      )
      if (!userObjectReturnedFromAuthorizeHandler) {
        return res
          .status(401)
          .redirect(
            `${baseUrl}${basePath}/error?error=CredentialsSignin&provider=${encodeURIComponent(
              provider.id
            )}`
          )
      } else if (typeof userObjectReturnedFromAuthorizeHandler === "string") {
        return res.redirect(userObjectReturnedFromAuthorizeHandler)
      }
    } catch (error) {
      return res.redirect(
        `${baseUrl}${basePath}/error?error=${encodeURIComponent(error.message)}`
      )
    }

    const user = userObjectReturnedFromAuthorizeHandler
    const account = { id: provider.id, type: "credentials" }

    try {
      const signInCallbackResponse = await callbacks.signIn({
        user,
        account,
        credentials,
      })
      if (!signInCallbackResponse) {
        return res
          .status(403)
          .redirect(`${baseUrl}${basePath}/error?error=AccessDenied`)
      } else if (typeof signInCallbackResponse === "string") {
        return res.redirect(signInCallbackResponse)
      }
    } catch (error) {
      return res.redirect(
        `${baseUrl}${basePath}/error?error=${encodeURIComponent(error.message)}`
      )
    }

    const defaultToken = {
      name: user.name,
      email: user.email,
      picture: user.image,
      sub: user.id?.toString(),
    }
    const token = await callbacks.jwt({
      token: defaultToken,
      user,
      account,
      profile: userObjectReturnedFromAuthorizeHandler,
      isNewUser: false,
    })

    // Sign and encrypt token
    const newEncodedJwt = await jwt.encode({ ...jwt, token })

    // Set cookie expiry date
    const cookieExpires = new Date()
    cookieExpires.setTime(cookieExpires.getTime() + sessionMaxAge * 1000)

    cookie.set(res, cookies.sessionToken.name, newEncodedJwt, {
      expires: cookieExpires.toISOString(),
      ...cookies.sessionToken.options,
    })

    await events.signIn({ user, account })

    return res.redirect(callbackUrl || baseUrl)
  }
  return res
    .status(500)
    .end(`Error: Callback for provider type ${provider.type} not supported`)
}

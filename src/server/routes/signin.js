import getAuthorizationUrl from "../lib/signin/oauth"
import emailSignin from "../lib/signin/email"
import adapterErrorHandler from "../../adapters/error-handler"

/**
 * Handle requests to /api/auth/signin
 * @param {import("types/internals").NextAuthRequest} req
 * @param {import("types/internals").NextAuthResponse} res
 */
export default async function signin(req, res) {
  const { baseUrl, basePath, adapter, callbacks, logger } = req.options

  /** @type {import("types/providers").OAuthConfig | import("types/providers").EmailConfig} */
  const provider = req.options.provider

  if (!provider.type) {
    return res.status(500).end(`Error: Type not specified for ${provider.name}`)
  }

  if (provider.type === "oauth") {
    try {
      const authorizationUrl = await getAuthorizationUrl(req, res)
      return res.redirect(authorizationUrl)
    } catch (error) {
      logger.error("SIGNIN_OAUTH_ERROR", error)
      return res.redirect(`${baseUrl}${basePath}/error?error=OAuthSignin`)
    }
  } else if (provider.type === "email") {
    if (!adapter) {
      logger.error("EMAIL_REQUIRES_ADAPTER_ERROR")
      return res.redirect(`${baseUrl}${basePath}/error?error=Configuration`)
    }
    const { getUserByEmail } = adapterErrorHandler(
      await adapter.getAdapter(req.options),
      logger
    )

    // Note: Technically the part of the email address local mailbox element
    // (everything before the @ symbol) should be treated as 'case sensitive'
    // according to RFC 2821, but in practice this causes more problems than
    // it solves. We treat email addresses as all lower case. If anyone
    // complains about this we can make strict RFC 2821 compliance an option.
    const email = req.body.email?.toLowerCase() ?? null

    // If is an existing user return a user object (otherwise use placeholder)
    const user = (await getUserByEmail(email)) || { email }
    const account = { id: provider.id, type: "email", providerAccountId: email }

    // Check if user is allowed to sign in
    try {
      const signInCallbackResponse = await callbacks.signIn({
        user,
        account,
        email: { email, verificationRequest: true },
      })
      if (!signInCallbackResponse) {
        return res.redirect(`${baseUrl}${basePath}/error?error=AccessDenied`)
      } else if (typeof signInCallbackResponse === "string") {
        return res.redirect(signInCallbackResponse)
      }
    } catch (error) {
      return res.redirect(
        `${baseUrl}${basePath}/error?error=${encodeURIComponent(error)}`
      )
    }

    try {
      await emailSignin(email, provider, req.options)
    } catch (error) {
      logger.error("SIGNIN_EMAIL_ERROR", error)
      return res.redirect(`${baseUrl}${basePath}/error?error=EmailSignin`)
    }

    return res.redirect(
      `${baseUrl}${basePath}/verify-request?provider=${encodeURIComponent(
        provider.id
      )}&type=${encodeURIComponent(provider.type)}`
    )
  }
  return res.redirect(`${baseUrl}${basePath}/signin`)
}

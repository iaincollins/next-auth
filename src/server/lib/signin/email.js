// @ts-check
import { randomBytes } from "crypto"
import { hashToken } from "../utils"

/**
 * @typedef {import("types/providers").EmailConfig} EmailConfig
 */

/**
 * Starts an e-mail login flow, by generating a token,
 * and sending it to the user's e-mail (with the help of a DB adapter)
 * @param {string} identifier
 * @param {import("types/internals").InternalOptions<EmailConfig>} options
 */
export default async function email(identifier, options) {
  const { baseUrl, basePath, adapter, provider } = options

  // Generate token
  const token =
    (await provider.generateVerificationToken?.()) ??
    randomBytes(32).toString("hex")

  // Generate a link with email and the unhashed token
  const params = new URLSearchParams({ token, email: identifier })
  const url = `${baseUrl}${basePath}/callback/${provider.id}?${params}`

  const ONE_DAY_IN_SECONDS = 86400
  const expires = new Date(
    Date.now() + (provider.maxAge ?? ONE_DAY_IN_SECONDS) * 1000
  )

  // Save in database
  // @ts-expect-error
  await adapter.createVerificationToken({
    identifier,
    token: hashToken(token, options),
    expires,
  })

  // Send to user
  await provider.sendVerificationRequest({
    identifier,
    token,
    expires,
    url,
    provider,
  })
}

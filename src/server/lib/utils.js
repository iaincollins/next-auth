import { createHash } from "crypto"

/**
 * Takes a number in seconds and returns the date in the future
 * Optionally takes a second date parameter. In that case
 * the date in the future will be calculated from that date instead of now.
 */
export function fromDate(time, date = Date.now()) {
  return new Date(date + time * 1000)
}

/**
 * @param {string} token
 * @param {import("types/internals").InternalOptions<EmailConfig>} options
 */
export function hashToken(token, options) {
  const { provider, secret } = options
  return (
    createHash("sha256")
      // Prefer provider specific secret, but use default secret if none specified
      .update(`${token}${provider.secret ?? secret}`)
      .digest("hex")
  )
}

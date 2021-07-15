/**
 *
 * @param {string} phoneNumber
 * @param {import("types/providers").SMSConfig} provider
 * @param {import("types/internals").AppOptions} options
 * @returns
 */
export default async function sms(phoneNumber, provider, options) {
  try {
    const { sendSmsVerificationRequest } = provider

    if (typeof sendSmsVerificationRequest !== "function") {
      throw new Error(
        "sendSmsVerificationRequest should be defined as a function"
      )
    }

    const verificationId = await sendSmsVerificationRequest(phoneNumber)
    return Promise.resolve(verificationId)
  } catch (err) {
    return Promise.reject(err)
  }
}

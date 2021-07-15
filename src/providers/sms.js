export default function SMS(options) {
  return {
    maxAge: 2 * 60,
    sendSmsVerificationRequest: null,
    verifySmsVerificationRequest: null,
    ...options,
    id: "sms",
    type: "sms",
    name: "SMS",
  }
}

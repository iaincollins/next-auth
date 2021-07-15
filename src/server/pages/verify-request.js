import { h, Fragment } from "preact" // eslint-disable-line no-unused-vars

export default function verifyRequest({
  csrfToken,
  baseUrl,
  provider,
  providerType,
  callbackUrl,
}) {
  return (
    <div className="verify-request">
      {provider === "email" && providerType === "email" && (
        <Fragment>
          <h1>Check your email</h1>
          <p>A sign in link has been sent to your email address.</p>
        </Fragment>
      )}
      {provider === "sms" && providerType === "sms" && (
        <div className="signin">
          <div className="provider">
            <h1>Check your phone</h1>
            <p>A one time OTP has been sent to your provided phone number.</p>
            <form action={callbackUrl} method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <label for={`input-otp-for-${provider}-provider`}>
                Enter OTP
              </label>
              <input
                id={`input-otp-for-${provider}-provider`}
                autoFocus
                type="password"
                name="otp"
                value={""}
              />
              <button type="submit">Verify</button>
            </form>
          </div>
        </div>
      )}

      <p>
        <a className="site" href={baseUrl}>
          {baseUrl.replace(/^https?:\/\//, "")}
        </a>
      </p>
    </div>
  )
}

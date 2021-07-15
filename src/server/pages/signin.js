import { h } from "preact" // eslint-disable-line no-unused-vars

export default function signin({
  csrfToken,
  providers,
  callbackUrl,
  email,
  error: errorType,
}) {
  // We only want to render providers
  const providersToRender = providers.filter((provider) => {
    if (
      provider.type === "oauth" ||
      provider.type === "email" ||
      provider.type === "sms"
    ) {
      // Always render oauth and email type providers
      return true
    } else if (provider.type === "credentials" && provider.credentials) {
      // Only render credentials type provider if credentials are defined
      return true
    }
    // Don't render other provider types
    return false
  })

  const errors = {
    Signin: "Try signing in with a different account.",
    OAuthSignin: "Try signing in with a different account.",
    OAuthCallback: "Try signing in with a different account.",
    OAuthCreateAccount: "Try signing in with a different account.",
    EmailCreateAccount: "Try signing in with a different account.",
    Callback: "Try signing in with a different account.",
    OAuthAccountNotLinked:
      "To confirm your identity, sign in with the same account you used originally.",
    EmailSignin: "Check your email inbox.",
    CredentialsSignin:
      "Sign in failed. Check the details you provided are correct.",
    default: "Unable to sign in.",
  }

  const error = errorType && (errors[errorType] ?? errors.default)

  return (
    <div className="signin">
      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}
      {providersToRender.map((provider, i) => (
        <div key={provider.id} className="provider">
          {provider.type === "oauth" && (
            <form action={provider.signinUrl} method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              {callbackUrl && (
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
              )}
              <button type="submit" className="button">
                Sign in with {provider.name}
              </button>
            </form>
          )}
          {(provider.type === "email" ||
            provider.type === "credentials" ||
            provider.type === "sms") &&
            i > 0 &&
            providersToRender[i - 1].type !== "email" &&
            providersToRender[i - 1].type !== "credentials" &&
            providersToRender[i - 1].type !== "sms" && <hr />}
          {provider.type === "email" && (
            <form action={provider.signinUrl} method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <label for={`input-email-for-${provider.id}-provider`}>
                Email
              </label>
              <input
                id={`input-email-for-${provider.id}-provider`}
                autoFocus
                type="text"
                name="email"
                value={email}
                placeholder="email@example.com"
              />
              <button type="submit">Sign in with {provider.name}</button>
            </form>
          )}
          {provider.type === "sms" && (
            <form action={provider.signinUrl} method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <label for={`input-phone-for-${provider.id}-provider`}>
                Phone Number (with country code)
              </label>
              <input
                id={`input-phone-for-${provider.id}-provider`}
                autoFocus
                type="tel"
                name="phoneNumber"
                value={""}
                placeholder="880123xxxxxxx"
              />
              <button type="submit">
                Sign in with {provider.name} Verification
              </button>
            </form>
          )}
          {provider.type === "credentials" && (
            <form action={provider.callbackUrl} method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              {Object.keys(provider.credentials).map((credential) => {
                return (
                  <div key={`input-group-${provider.id}`}>
                    <label
                      for={`input-${credential}-for-${provider.id}-provider`}
                    >
                      {provider.credentials[credential].label || credential}
                    </label>
                    <input
                      name={credential}
                      id={`input-${credential}-for-${provider.id}-provider`}
                      type={provider.credentials[credential].type || "text"}
                      value={provider.credentials[credential].value || ""}
                      placeholder={
                        provider.credentials[credential].placeholder || ""
                      }
                    />
                  </div>
                )
              })}
              <button type="submit">Sign in with {provider.name}</button>
            </form>
          )}
          {(provider.type === "email" ||
            provider.type === "credentials" ||
            provider.type === "sms") &&
            i + 1 < providersToRender.length && <hr />}
        </div>
      ))}
    </div>
  )
}

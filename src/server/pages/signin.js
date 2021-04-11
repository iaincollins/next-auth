import { h } from 'preact' // eslint-disable-line no-unused-vars

export default function signin ({ csrfToken, providers, callbackUrl, email, error: errorType, locale, texts }) {
  // We only want to render providers
  const providersToRender = providers.filter(provider => {
    if (provider.type === 'oauth' || provider.type === 'email') {
      // Always render oauth and email type providers
      return true
    } else if (provider.type === 'credentials' && provider.credentials) {
      // Only render credentials type provider if credentials are defined
      return true
    }
    // Don't render other provider types
    return false
  })

  const error = errorType && (texts.errors[errorType] ?? texts.errors.default)

  return (
    <div className='signin'>
      {error &&
        <div className='error'>
          <p>{error}</p>
        </div>}
      {providersToRender.map((provider, i) =>
        <div key={provider.id} className='provider'>
          {provider.type === 'oauth' &&
            <form action={provider.signinUrl} method='POST'>
              <input type='hidden' name='csrfToken' value={csrfToken} />
              {callbackUrl && <input type='hidden' name='callbackUrl' value={callbackUrl} />}
              <button type='submit' className='button'>{texts.submit.replace('%s', provider.name)}</button>
            </form>}
          {(provider.type === 'email' || provider.type === 'credentials') && (i > 0) &&
          providersToRender[i - 1].type !== 'email' && providersToRender[i - 1].type !== 'credentials' &&
            <hr divider-text={texts.dividerText} />}
          {provider.type === 'email' &&
            <form action={provider.signinUrl} method='POST'>
              <input type='hidden' name='csrfToken' value={csrfToken} />
              <label for={`input-email-for-${provider.id}-provider`}>{texts.email}</label>
              <input id={`input-email-for-${provider.id}-provider`} autoFocus type='text' name='email' value={email} placeholder='email@example.com' />
              <button type='submit'>{texts.submit.replace('%s', provider.name)}</button>
            </form>}
          {provider.type === 'credentials' &&
            <form action={provider.callbackUrl} method='POST'>
              <input type='hidden' name='csrfToken' value={csrfToken} />
              {Object.keys(provider.credentials).map(credential => {
                return (
                  <div key={`input-group-${provider.id}`}>
                    <label
                      for={`input-${credential}-for-${provider.id}-provider`}
                    >{(typeof provider.credentials[credential].label === 'object' ? provider.credentials[credential].label[locale] : provider.credentials[credential].label) || credential}
                    </label>
                    <input
                      name={credential}
                      id={`input-${credential}-for-${provider.id}-provider`}
                      type={provider.credentials[credential].type || 'text'}
                      value={provider.credentials[credential].value || ''}
                      placeholder={provider.credentials[credential].placeholder || ''}
                    />
                  </div>
                )
              })}
              <button type='submit'>{texts.submit.replace('%s', provider.name)}</button>
            </form>}
          {(provider.type === 'email' || provider.type === 'credentials') && ((i + 1) < providersToRender.length) &&
            <hr divider-text={texts.dividerText} />}
        </div>
      )}
    </div>
  )
}

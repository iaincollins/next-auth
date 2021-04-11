// @ts-check
import { h } from 'preact' // eslint-disable-line no-unused-vars

/**
 * Renders an error page.
 * @param {{
 *   baseUrl: string
 *   basePath: string
 *   error?: string
 *   texts: object
 *   res: import("..").NextAuthResponse
 * }} params
 */
export default function error ({ baseUrl, basePath, error = 'default', texts, res }) {
  const signinPageUrl = `${baseUrl}${basePath}/signin`

  const errors = {
    default: {
      statusCode: 200,
      heading: texts.default.heading,
      message: <p><a className='site' href={baseUrl}>{baseUrl.replace(/^https?:\/\//, '')}</a></p>
    },
    configuration: {
      statusCode: 500,
      heading: texts.configuration.heading,
      message: (
        <div>
          <p>{texts.configuration.message}</p>
          <p>{texts.configuration.serverLogHint}</p>
        </div>
      )
    },
    accessdenied: {
      statusCode: 403,
      heading: texts.accessdenied.heading,
      message: (
        <div>
          <p>{texts.accessdenied.message}</p>
          <p><a className='button' href={signinPageUrl}>{texts.signIn}</a></p>
        </div>
      )
    },
    verification: {
      statusCode: 403,
      heading: texts.verification.heading,
      message: (
        <div>
          <p>{texts.verification.message}</p>
          <p>{texts.verification.expirationHint}</p>
        </div>
      ),
      signin: <p><a className='button' href={signinPageUrl}>{texts.signIn}</a></p>
    }
  }

  const { statusCode, heading, message, signin } = errors[error.toLowerCase()]

  res.status(statusCode)

  return (
    <div className='error'>
      <h1>{heading}</h1>
      <div className='message'>{message}</div>
      {signin}
    </div>
  )
}

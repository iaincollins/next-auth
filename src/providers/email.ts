import nodemailer from 'nodemailer'
import logger from '../lib/logger'
import { ProviderReturnConfig } from '../interfaces'

export interface ProviderEmailOptions {
  server: string | ProviderEmailServer;
  from: string;
  maxAge?: number;
  sendVerificationRequest?: typeof sendVerificationRequest;
}

export interface ProviderEmailServer {
  host: string;
  port: number;
  auth: ProviderEmailAuth;
}

export interface ProviderEmailAuth {
  user: string;
  pass: string;
}

export default (options: ProviderEmailOptions): ProviderReturnConfig => {
  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    // Server can be an SMTP connection string or a nodemailer config object
    server: {
      host: 'localhost',
      port: 25,
      auth: {
        user: '',
        pass: ''
      }
    },
    from: 'NextAuth <no-reply@example.com>',
    maxAge: 24 * 60 * 60, // How long email links are valid for (default 24h)
    sendVerificationRequest,
    ...options
  }
}

const sendVerificationRequest = ({ identifier: email, url, baseUrl, provider }) => {
  return new Promise((resolve, reject) => {
    const { server, from } = provider
    // Strip protocol from URL and use domain as site name
    const site = baseUrl.replace(/^https?:\/\//, '')

    nodemailer
      .createTransport(server)
      .sendMail({
        to: email,
        from,
        subject: `Sign in to ${site}`,
        text: text({ url, site }),
        html: html({ url, site, email })
      }, (error) => {
        if (error) {
          logger.error('SEND_VERIFICATION_EMAIL_ERROR', email, error)
          return reject(new Error('SEND_VERIFICATION_EMAIL_ERROR'))
        }
        return resolve()
      })
  })
}

// Email HTML body
const html = ({ url, site, email }) => {
  // Insert invisible space into domains and email address to prevent both the
  // email address and the domain from being turned into a hyperlink by email
  // clients like Outlook and Apple mail, as this is confusing because it seems
  // like they are supposed to click on their email address to sign in.
  const escapedEmail = `${email.replace(/\./g, '&#8203;.')}`
  const escapedSite = `${site.replace(/\./g, '&#8203;.')}`

  // Some simple styling options
  const backgroundColor = '#f9f9f9'
  const textColor = '#444444'
  const mainBackgroundColor = '#ffffff'
  const buttonBackgroundColor = '#346df1'
  const buttonBorderColor = '#346df1'
  const buttonTextColor = '#ffffff'

  return `
<body style="background: ${backgroundColor};">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 10px 0px 20px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
        <strong>${escapedSite}</strong>
      </td>
    </tr>
  </table>
  <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
        Sign in as <strong>${escapedEmail}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; text-decoration: none;border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Sign in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`
}

// Email Text body (fallback for email clients that don't render HTML, e.g. feature phones)
const text = ({ url, site }) => `Sign in to ${site}\n${url}\n\n`

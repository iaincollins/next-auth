import renderToString from 'preact-render-to-string'
import signin from './signin'
import signout from './signout'
import verifyRequest from './verify-request'
import error from './error'
import css from '../../css'
import defaultTranslations from '../lib/default-translations'
import { mergeDeep } from '../../lib/object-utils'

/** Takes a request and response, and gives renderable pages */
export default function renderPage (req, res) {
  const { baseUrl, basePath, callbackUrl, csrfToken, providers, theme, locale, locales } = req.options

  res.setHeader('Content-Type', 'text/html')
  function send ({ html, title }) {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css()}</style><title>${title}</title></head><body class="__next-auth-theme-${theme}"><div class="page">${renderToString(html)}</div></body></html>`)
  }

  // merge default and client provided translations
  const texts = mergeDeep({}, defaultTranslations, locales[locale])

  return {
    signin (props) {
      send({
        html: signin({ csrfToken, providers, callbackUrl, locale, texts: texts.signIn, ...req.query, ...props }),
        title: texts.signIn.title
      })
    },
    signout (props) {
      send({
        html: signout({ csrfToken, baseUrl, basePath, locale, texts: texts.signOut, ...props }),
        title: texts.signOut.title
      })
    },
    verifyRequest (props) {
      send({
        html: verifyRequest({ baseUrl, locale, texts: texts.verifyRequest, ...props }),
        title: texts.verifyRequest.title
      })
    },
    error (props) {
      send({
        html: error({ basePath, baseUrl, locale, texts: texts.error, res, ...props }),
        title: texts.error.title
      })
    }
  }
}

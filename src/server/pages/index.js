import renderToString from "preact-render-to-string"
import signin from "./signin"
import signout from "./signout"
import verifyRequest from "./verify-request"
import error from "./error"
import css from "../../css"

/** Takes a request and response, and gives renderable pages */
export default function renderPage(req, res) {
  const { baseUrl, basePath, callbackUrl, csrfToken, providers, theme } =
    req.options

  res.setHeader("Content-Type", "text/html")
  function send({ html, title }) {
    res.send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${css()}</style><title>${title}</title></head><body class="__next-auth-theme-${theme}"><div class="page">${renderToString(
        html
      )}</div></body></html>`
    )
  }

  return {
    signin(props) {
      send({
        html: signin({
          csrfToken,
          providers,
          callbackUrl,
          ...req.query,
          ...props,
        }),
        title: "Sign In",
      })
    },
    signout(props) {
      send({
        html: signout({ csrfToken, baseUrl, basePath, ...props }),
        title: "Sign Out",
      })
    },
    verifyRequest(props) {
      send({
        html: verifyRequest({ csrfToken, baseUrl, ...props }),
        title: "Verify Request",
      })
    },
    error(props) {
      send({
        html: error({ basePath, baseUrl, res, ...props }),
        title: "Error",
      })
    },
  }
}

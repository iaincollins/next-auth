import getSession from "../lib/session"

/**
 * Return a session object (without any private fields)
 * for Single Page App clients
 * @param {import("types/internals").NextAuthRequest} req
 * @param {import("types/internals").NextAuthResponse} res
 */
export default async function session(req, res) {
  const sessionToken = await getSession(req, res)

  if (!sessionToken) {
    return res.json({})
  }

  res.json(sessionToken)
}

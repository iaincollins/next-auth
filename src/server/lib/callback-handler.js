// @ts-check
import { AccountNotLinkedError } from "../../lib/errors"
import { fromDate } from "./utils"

/**
 * This function handles the complex flow of signing users in, and either creating,
 * linking (or not linking) accounts depending on if the user is currently logged
 * in, if they have account already and the authentication mechanism they are using.
 *
 * It prevents insecure behaviour, such as linking OAuth accounts unless a user is
 * signed in and authenticated with an existing valid account.
 *
 * All verification (e.g. OAuth flows or email address verificaiton flows) are
 * done prior to this handler being called to avoid additonal complexity in this
 * handler.
 * @param {import("types/internals/cookies").SessionToken | null} sessionToken
 * @param {import("types").Account} account
 * @param {import("types/internals").InternalOptions} options
 */
export default async function callbackHandler(
  sessionToken,
  profile,
  account,
  options
) {
  // Input validation
  if (!account?.id || !account.type)
    throw new Error("Missing or invalid provider account")
  if (!["email", "oauth"].includes(account.type))
    throw new Error("Provider not supported")

  const {
    adapter,
    jwt,
    events,
    session: { jwt: useJwtSession },
  } = options

  // If no adapter is configured then we don't have a database and cannot
  // persist data; in this mode we just return a dummy session object.
  if (!adapter) {
    return { user: profile, account, session: {} }
  }

  const {
    createUser,
    updateUser,
    getUser,
    getUserByProviderAccountId,
    getUserByEmail,
    linkAccount,
    createSession,
    getSession,
    deleteSession,
  } = adapter

  /** @type {import("types/adapters").AdapterSession | import("types/jwt").JWT | null} */
  let session = null
  /** @type {import("types/adapters").AdapterUser | null} */
  let user = null
  let isNewUser = false

  if (sessionToken) {
    if (useJwtSession) {
      try {
        session = await jwt.decode({ ...jwt, token: sessionToken })
        if (session?.sub) {
          user = await getUser(session.sub)
        }
      } catch {
        // If session can't be verified, treat as no session
      }
    }
    session = await getSession(sessionToken)
    if (session?.userId) {
      user = await getUser(session.userId)
      isSignedIn = !!user
    }
  }

  if (account.type === "email") {
    // If signing in with an email, check if an account with the same email address exists already
    const userByEmail = profile.email && (await getUserByEmail(profile.email))
    if (userByEmail) {
      // If they are not already signed in as the same user, this flow will
      // sign them out of the current session and sign them in as the new user
      if (user?.id !== userByEmail.id && !useJwtSession && sessionToken) {
        // Delete existing session if they are currently signed in as another user.
        // This will switch user accounts for the session in cases where the user was
        // already logged in with a different account.
        await deleteSession(sessionToken)
      }

      // Update emailVerified property on the user object
      const currentDate = new Date()
      user = await updateUser({ ...userByEmail, emailVerified: currentDate })
      await events.updateUser?.({ user })
    } else {
      // Create user account if there isn't one for the email address already
      const currentDate = new Date()
      user = await createUser({ ...profile, emailVerified: currentDate })
      await events.createUser?.({ user })
      isNewUser = true
    }

    // Create new session
    session = useJwtSession
      ? {}
      : await createSession({
          userId: user.id,
          expires: fromDate(options.session.maxAge),
        })

    return { session, user, isNewUser }
  } else if (account.type === "oauth") {
    // If signing in with OAuth account, check to see if the account exists already
    const userByProviderAccountId = await getUserByProviderAccountId(
      account.provider,
      account.id
    )
    if (userByProviderAccountId) {
      if (user) {
        // If the user is already signed in with this account, we don't need to do anything
        if (userByProviderAccountId.id === user.id) {
          return { session, user, isNewUser }
        }
        // If the user is currently signed in, but the new account they are signing in
        // with is already associated with another account, then we cannot link them
        // and need to return an error.
        throw new AccountNotLinkedError()
      }
      // If there is no active session, but the account being signed in with is already
      // associated with a valid user then create session to sign the user in.
      session = useJwtSession
        ? {}
        : await createSession({
            userId: userByProviderAccountId.id,
            expires: fromDate(options.session.maxAge),
          })

      return { session, user: userByProviderAccountId, isNewUser }
    } else {
      if (user) {
        // If the user is already signed in and the OAuth account isn't already associated
        // with another user account then we can go ahead and link the accounts safely.
        await linkAccount(user.id, account)
        await events.linkAccount?.({ user, account })

        // As they are already signed in, we don't need to do anything after linking them
        return { session, user, isNewUser }
      }

      // If the user is not signed in and it looks like a new OAuth account then we
      // check there also isn't an user account already associated with the same
      // email address as the one in the OAuth profile.
      //
      // This step is often overlooked in OAuth implementations, but covers the following cases:
      //
      // 1. It makes it harder for someone to accidentally create two accounts.
      //    e.g. by signin in with email, then again with an oauth account connected to the same email.
      // 2. It makes it harder to hijack a user account using a 3rd party OAuth account.
      //    e.g. by creating an oauth account then changing the email address associated with it.
      //
      // It's quite common for services to automatically link accounts in this case, but it's
      // better practice to require the user to sign in *then* link accounts to be sure
      // someone is not exploiting a problem with a third party OAuth service.
      //
      // OAuth providers should require email address verification to prevent this, but in
      // practice that is not always the case; this helps protect against that.
      const userByEmail = profile.email && (await getUserByEmail(profile.email))
      if (userByEmail) {
        // We end up here when we don't have an account with the same [provider].id *BUT*
        // we do already have an account with the same email address as the one in the
        // OAuth profile the user has just tried to sign in with.
        //
        // We don't want to have two accounts with the same email address, and we don't
        // want to link them in case it's not safe to do so, so instead we prompt the user
        // to sign in via email to verify their identity and then link the accounts.
        throw new AccountNotLinkedError()
      }
      // If the current user is not logged in and the profile isn't linked to any user
      // accounts (by email or provider account id)...
      //
      // If no account matching the same [provider].id or .email exists, we can
      // create a new account for the user, link it to the OAuth acccount and
      // create a new session for them so they are signed in with it.
      user = await createUser({ ...profile, emailVerified: null })
      await events.createUser?.({ user })

      await linkAccount(user.id, account)
      await events.linkAccount?.({ user, account })

      session = useJwtSession
        ? {}
        : await createSession({
            userId: user.id,
            expires: fromDate(options.session.maxAge),
          })

      return { session, user, isNewUser: true }
    }
  }
}

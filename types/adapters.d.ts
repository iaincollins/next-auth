import { Account, User } from "."
import { Awaitable } from "./internals/utils"

export interface AdapterUser extends User {
  id: string
  emailVerified: Date | null
}

export interface AdapterSession {
  id: string
  userId: string
  expires: Date
}

export interface VerificationToken {
  identifier: string
  expires: Date
  token: string
}

/**
 * Using a custom adapter you can connect to any database backend or even several different databases.
 * Custom adapters created and maintained by our community can be found in the adapters repository.
 * Feel free to add a custom adapter from your project to the repository,
 * or even become a maintainer of a certain adapter.
 * Custom adapters can still be created and used in a project without being added to the repository.
 *
 * **Required methods**
 *
 * _(These methods are required for all sign in flows)_
 * - `createUser`
 * - `getUser`
 * - `getUserByEmail`
 * - `getUserByProviderAccountId`
 * - `linkAccount`
 * - `createSession`
 * - `getSession`
 * - `updateSession`
 * - `deleteSession`
 * - `updateUser`
 *
 * _(Required to support email / passwordless sign in)_
 *
 * - `createVerificationToken`
 * - `useVerificationToken`
 *
 * **Unimplemented methods**
 *
 * _(These methods will be required in a future release, but are not yet invoked)_
 * - `deleteUser`
 * - `unlinkAccount`
 *
 * [Community adapters](https://github.com/nextauthjs/adapters) |
 * [Create a custom adapter](https://next-auth.js.org/tutorials/creating-a-database-adapter)
 */
export interface Adapter {
  /** Used as a prefix for adapter related log messages. (Defaults to `ADAPTER_`) */
  displayName: string
  createUser(user: AdapterUser): Awaitable<AdapterUser>
  getUser(id: string): Awaitable<AdapterUser | null>
  getUserByEmail(email: string): Awaitable<AdapterUser | null>
  getUserByProviderAccountId(
    providerId: string,
    providerAccountId: string
  ): Awaitable<AdapterUser | null>
  updateUser(user: AdapterUser): Awaitable<AdapterUser>
  /** @todo Implement */
  deleteUser?(userId: string): Awaitable<void>
  linkAccount(userId: string, account: Account): Awaitable<void>
  /** @todo Implement */
  unlinkAccount?(
    userId: string,
    providerId: string,
    providerAccountId: string
  ): Awaitable<void>
  /** Creates a session for the user and returns it. */
  createSession(params: {
    userId: string
    expires: Date
  }): Awaitable<AdapterSession>
  getSession(sessionId: string): Awaitable<AdapterSession | null>
  updateSession(
    session: AdapterSession,
    force?: boolean
  ): Awaitable<AdapterSession | null>
  deleteSession(sessionId: string): Awaitable<void>
  createVerificationToken?(params: VerificationToken): Awaitable<void>
  /**
   * Return verification token from the database
   * and delete it so it cannot be used again.
   */
  useVerificationToken?(params: {
    identifier: string
    token: string
  }): Awaitable<VerificationToken | null>
}

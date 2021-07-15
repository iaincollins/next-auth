---
id: creating-a-database-adapter
title: Creating a database adapter
---

Using a custom adapter you can connect to any database backend or even several different databases.  Custom adapters created and maintained by our community can be found in the [adapters repository](https://github.com/nextauthjs/adapters). Feel free to add a custom adapter from your project to the repository, or even become a maintainer of a certain adapter. Custom adapters can still be created and used in a project without being added to the repository.

Creating a custom adapter can be considerable undertaking and will require some trial and error and some reverse engineering using the built-in adapters for reference.

## How to create an adapter

_See the code below for practical example._

### Required properties

* displayName

### Required methods

These methods are required for all sign in flows:

* createUser
* getUser
* getUserByEmail  
* getUserByProviderAccountId
* linkAccount
* createSession
* getSession
* updateSession
* deleteSession
* updateUser

These methods are required to support email / passwordless sign in:

* createVerificationToken
* useVerificationToken

### Unimplemented methods

These methods will be required in a future release, but are not yet invoked:

* deleteUser
* unlinkAccount

### Example code

```js
/** @return { import("next-auth/adapters").Adapter } */
export default function MyAdapter(client, options = {}) {
  return {
    displayName: "foo",
    async createUser (profile) {
      return null
    },
    async getUser (id) {
      return null
    },
    async getUserByEmail (email) {
      return null
    },
    async getUserByProviderAccountId (
      providerId,
      providerAccountId
    ) {
      return null
    },
    async updateUser (user) {
      return null
    },
    async deleteUser (userId) {
      return null
    },
    async linkAccount (userId, account) {
      return null
    },
    async unlinkAccount (
      userId,
      providerId,
      providerAccountId
    ) {
      return null
    },
    async createSession (user) {
      return null
    },
    async getSession (sessionToken) {
      return null
    },
    async updateSession (session, force) {
      return null
    },
    async deleteSession (sessionToken) {
      return null
    },
    async createVerificationToken ({
      identifier,
      url,
      token,
      expires
    }) {
      return null
    },
    async useVerificationToken ({
      identifier,
      token,
    }) {
      return null
    },
  }
}
```

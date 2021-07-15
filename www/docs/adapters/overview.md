---
id: overview
title: Overview
---

An **Adapter** in NextAuth.js connects your application to whatever database or backend system you want to use to store data for user accounts, sessions, etc.

The adapters can be found in their own repository under [`nextauthjs/adapters`](https://github.com/nextauthjs/adapters).

There you can find the following adapters:

- [`typeorm-legacy`](./typeorm/typeorm-overview)
- [`prisma`](./prisma)
- [`prisma-legacy`](./prisma-legacy)
- [`fauna`](./fauna)
- [`dynamodb`](./dynamodb)
- [`firebase`](./firebase)
- [`pouchdb`](./pouchdb)

## Custom Adapter

See the tutorial for [creating a database Adapter](/tutorials/creating-a-database-adapter) for more information on how to create a custom Adapter. Have a look at the [Adapter repository](https://github.com/nextauthjs/adapters) to see community maintained custom Adapter or add your own.

### Editor integration

When writing your own custom Adapter in plain JavaScript, note that you can use **JSDoc** to get helpful editor hints and auto-completion like so:

```js
/** @return { import("next-auth/adapters").Adapter } */
function MyAdapter() {
  return {
    // your adapter methods here
  }
}
```

:::note
This will work in code editors with a strong TypeScript integration like VSCode or WebStorm. It might not work if you're using more lightweight editors like VIM or Atom.
:::

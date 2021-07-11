---
id: yuque
title: Yuque
---

## Documentation

https://www.yuque.com/yuque/developer/api

## Configuration

https://www.yuque.com/settings/applications

## Options

The **Yuque Provider** comes with a set of default options:

- [Yuque Provider options](https://github.com/nextauthjs/next-auth/blob/main/src/providers/yuque.js)

You can override any of the options to suit your own use case.

## Example

```js
import Providers from `next-auth/providers`
...
providers: [
  Providers.Yuque({
    clientId: process.env.YUQUE_CLIENT_ID,
    clientSecret: process.env.YUQUE_CLIENT_SECRET
  })
]
...
```

:::warning
Yuque doesn't expose the user's email in API
:::

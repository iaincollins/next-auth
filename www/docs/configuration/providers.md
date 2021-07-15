---
id: providers
title: Providers
---

Authentication Providers in **NextAuth.js** are services that can be used to sign in a user.

There's four ways a user can be signed in:

- [Using a built-in OAuth Provider](#oauth-providers) (e.g Github, Twitter, Google, etc...)
- [Using a custom OAuth Provider](#using-a-custom-provider)
- [Using Email](#email-provider)
- [Using Credentials](#credentials-provider)

:::note
NextAuth.js is designed to work with any OAuth service, it supports **OAuth 1.0**, **1.0A** and **2.0** and has built-in support for most popular sign-in services.
:::

## OAuth Providers

### Available providers

<div className="provider-name-list">
{Object.entries(require("../../providers.json"))
  .filter(([key]) => !["email", "credentials"].includes(key))
  .sort(([, a], [, b]) => a.localeCompare(b))
  .map(([key, name]) => (
    <span key={key}>
      <a href={`/providers/${key}`}>{name}</a>
      <span className="provider-name-list__comma">,</span>
    </span>
  )
    
)}
</div>

### How to

1. Register your application at the developer portal of your provider. There are links above to the developer docs for most supported providers with details on how to register your application.

2. The redirect URI should follow this format:

```
[origin]/api/auth/callback/[provider]
```

For example, Twitter on `localhost` this would be:

```
http://localhost:3000/api/auth/callback/twitter
```

3. Create a `.env` file at the root of your project and add the client ID and client secret. For Twitter this would be:

```
TWITTER_ID=YOUR_TWITTER_CLIENT_ID
TWITTER_SECRET=YOUR_TWITTER_CLIENT_SECRET
```

4. Now you can add the provider settings to the NextAuth options object. You can add as many OAuth providers as you like, as you can see `providers` is an array.

```js title="pages/api/auth/[...nextauth].js"
import Providers from `next-auth/providers`
...
providers: [
  Providers.Twitter({
    clientId: process.env.TWITTER_ID,
    clientSecret: process.env.TWITTER_SECRET
  })
],
...
```

5. Once a provider has been setup, you can sign in at the following URL: `[origin]/api/auth/signin`. This is an unbranded auto-generated page with all the configured providers.

<Image src="/img/signin.png" alt="Signin Screenshot" />

### Options

|        Name         |                           Description                            |             Type              | Required |
| :-----------------: | :--------------------------------------------------------------: | :---------------------------: | :------: |
|         id          |                    Unique ID for the provider                    |           `string`            |   Yes    |
|        name         |                Descriptive name for the provider                 |           `string`            |   Yes    |
|        type         |              Type of provider, in this case `oauth`              |           `"oauth"`           |   Yes    |
|       version       |            OAuth version (e.g. '1.0', '1.0a', '2.0')             |           `string`            |   Yes    |
|        scope        |          OAuth access scopes (expects array or string)           |    `string` or `string[]`     |   Yes    |
|       params        |       Extra URL params sent when calling `accessTokenUrl`        |           `Object`            |   Yes    |
|   accessTokenUrl    |               Endpoint to retrieve an access token               |           `string`            |   Yes    |
|  authorizationUrl   |         Endpoint to request authorization from the user          |           `string`            |   Yes    |
|   requestTokenUrl   |               Endpoint to retrieve a request token               |           `string`            |   Yes    |
|     profileUrl      |             Endpoint to retrieve the user's profile              |           `string`            |   Yes    |
|      clientId       |                 Client ID of the OAuth provider                  |           `string`            |   Yes    |
|    clientSecret     |               Client Secret of the OAuth provider                |           `string`            |   Yes    |
|       profile       |       A callback returning an object with the user's info        | `(profile, tokens) => Object` |   Yes    |
|     protection      | Additional security for OAuth login flows (defaults to `state`)  |  `"pkce"`,`"state"`,`"none"`  |    No    |
|        state        | Same as `protection: "state"`. Being deprecated, use protection. |           `boolean`           |    No    |
|       headers       |      Any headers that should be sent to the OAuth provider       |           `Object`            |    No    |
| authorizationParams |    Additional params to be sent to the authorization endpoint    |           `Object`            |    No    |
|       idToken       |   Set to `true` for services that use ID Tokens (e.g. OpenID)    |           `boolean`           |    No    |
|       region        |                    Only when using BattleNet                     |           `string`            |    No    |
|       domain        |                Only when using certain Providers                 |           `string`            |    No    |
|      tenantId       |     Only when using Azure, Active Directory, B2C, FusionAuth     |           `string`            |    No    |

:::tip
Even if you are using a built-in provider, you can override any of these options to tweak the default configuration.

```js title=[...nextauth].js
import Providers from "next-auth/providers"

Providers.Auth0({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  domain: process.env.DOMAIN,
  scope: "openid your_custom_scope", // We do provide a default, but this will override it if defined
  profile(profile) {
    return {} // Return the profile in a shape that is different from the built-in one.
  },
})
```

:::

### Using a custom provider

You can use an OAuth provider that isn't built-in by using a custom object.

As an example of what this looks like, this is the provider object returned for the Google provider:

```js
{
  id: "google",
  name: "Google",
  type: "oauth",
  version: "2.0",
  scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
  params: { grant_type: "authorization_code" },
  accessTokenUrl: "https://accounts.google.com/o/oauth2/token",
  requestTokenUrl: "https://accounts.google.com/o/oauth2/auth",
  authorizationUrl: "https://accounts.google.com/o/oauth2/auth?response_type=code",
  profileUrl: "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
  async profile(profile, tokens) {
    // You can use the tokens, in case you want to fetch more profile information
    // For example several OAuth providers do not return email by default.
    // Depending on your provider, will have tokens like `access_token`, `id_token` and or `refresh_token`
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      image: profile.picture
    }
  },
  clientId: "",
  clientSecret: ""
}
```

Replace all the options in this JSON object with the ones from your custom provider - be sure to give it a unique ID and specify the correct OAuth version - and add it to the providers option when initializing the library:

```js title="pages/api/auth/[...nextauth].js"
import Providers from `next-auth/providers`
...
providers: [
  Providers.Twitter({
    clientId: process.env.TWITTER_ID,
    clientSecret: process.env.TWITTER_SECRET,
  }),
  {
    id: 'customProvider',
    name: 'CustomProvider',
    type: 'oauth',
    version: '2.0',
    scope: ''  // Make sure to request the users email address
    ...
  }
]
...
```

### Adding a new provider

If you think your custom provider might be useful to others, we encourage you to open a PR and add it to the built-in list so others can discover it much more easily!

You only need to add two changes:

1. Add your config: [`src/providers/{provider}.js`](https://github.com/nextauthjs/next-auth/tree/main/src/providers)<br />
   • make sure you use a named default export, like this: `export default function YourProvider`
2. Add provider documentation: [`www/docs/providers/{provider}.md`](https://github.com/nextauthjs/next-auth/tree/main/www/docs/providers)
3. Add it to our [provider types](https://github.com/nextauthjs/next-auth/blob/main/types/providers.d.ts) (for TS projects)<br />
   • you just need to add your new provider name to [this list](https://github.com/nextauthjs/next-auth/blob/main/types/providers.d.ts#L56-L97)<br />
   • in case your new provider accepts some custom options, you can [add them here](https://github.com/nextauthjs/next-auth/blob/main/types/providers.d.ts#L48-L53)

That's it! 🎉 Others will be able to discover this provider much more easily now!

## Email Provider

### How to

The Email provider uses email to send "magic links" that can be used sign in, you will likely have seen them before if you have used software like Slack.

Adding support for signing in via email in addition to one or more OAuth services provides a way for users to sign in if they lose access to their OAuth account (e.g. if it is locked or deleted).

Configuration is similar to other providers, but the options are different:

```js title="pages/api/auth/[...nextauth].js"
import Providers from `next-auth/providers`
...
providers: [
  Providers.Email({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
    // maxAge: 24 * 60 * 60, // How long email links are valid for (default 24h)
  }),
],
...
```

See the [Email provider documentation](/providers/email) for more information on how to configure email sign in.

:::note
The email provider requires a database, it cannot be used without one.
:::

### Options

|          Name           |                                     Description                                     |               Type               | Required |
| :---------------------: | :---------------------------------------------------------------------------------: | :------------------------------: | :------: |
|           id            |                             Unique ID for the provider                              |             `string`             |   Yes    |
|          name           |                          Descriptive name for the provider                          |             `string`             |   Yes    |
|          type           |                       Type of provider, in this case `email`                        |            `"email"`             |   Yes    |
|         server          |                     Path or object pointing to the email server                     |       `string` or `Object`       |   Yes    |
| sendVerificationRequest |               Callback to execute when a verification request is sent               | `(params) => Promise<undefined>` |   Yes    |
|          from           |   The email address from which emails are sent, default: "<no-reply@example.com>"   |             `string`             |    No    |
|         maxAge          | How long until the e-mail can be used to log the user in seconds. Defaults to 1 day |             `number`             |    No    |

## Credentials Provider

### How to

The Credentials provider allows you to handle signing in with arbitrary credentials, such as a username and password, two factor authentication or hardware device (e.g. YubiKey U2F / FIDO).

It is intended to support use cases where you have an existing system you need to authenticate users against.

```js title="pages/api/auth/[...nextauth].js"
import Providers from `next-auth/providers`
...
providers: [
  Providers.Credentials({
    // The name to display on the sign in form (e.g. 'Sign in with...')
    name: 'Credentials',
    // The credentials is used to generate a suitable form on the sign in page.
    // You can specify whatever fields you are expecting to be submitted.
    // e.g. domain, username, password, 2FA token, etc.
    credentials: {
      username: { label: "Username", type: "text", placeholder: "jsmith" },
      password: {  label: "Password", type: "password" }
    },
    async authorize(credentials, req) {
      // You need to provide your own logic here that takes the credentials
      // submitted and returns either a object representing a user or value
      // that is false/null if the credentials are invalid.
      // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
      // You can also use the `req` object to obtain additional parameters
      // (i.e., the request IP address) 
      const res = await fetch("/your/endpoint", {
        method: 'POST',
        body: JSON.stringify(credentials),
        headers: { "Content-Type": "application/json" }
      })
      const user = await res.json()
      
      // If no error and we have user data, return it
      if (res.ok && user) {
        return user
      }
      // Return null if user data could not be retrieved
      return null
    }
  })
]
...
```

See the [Credentials provider documentation](/providers/credentials) for more information.

:::note
The Credentials provider can only be used if JSON Web Tokens are enabled for sessions. Users authenticated with the Credentials provider are not persisted in the database.
:::

### Options

|    Name     |                    Description                    |               Type                    | Required |
| :---------: | :-----------------------------------------------: | :-----------------------------------: | :------: |
|     id      |            Unique ID for the provider             |             `string`                  |   Yes    |
|    name     |         Descriptive name for the provider         |             `string`                  |   Yes    |
|    type     |   Type of provider, in this case `credentials`    |         `"credentials"`               |   Yes    |
| credentials |          The credentials to sign-in with          |             `Object`                  |   Yes    |
|  authorize  | Callback to execute once user is to be authorized | `(credentials, req) => Promise<User>` |   Yes    |


## SMS Provider

### How to

The SMS provider allows you to login with your phone instead of your email. Once you request to login, your phone will receive a One Time Password (OTP) that you will need to enter in order to be able to sign in. 

This is intended to support a usecase where users with poor digital skills or without an email can login with their phone numbers.

Configuration is a bit different to other providers, since the other providers use emails as opposed to phone numbers. You will need to use a third-party SMS/Verification Provider. Two popular ones are [MessageBird](https://developers.messagebird.com/api/verify/) and [Twilio](https://www.twilio.com/docs/verify/api).

```js title="pages/api/auth/[...nextauth].js"
import SMSProvider from "next-auth/providers/sms"
...
providers: [
  SMSProvider({
      sendSmsVerificationRequest: (recipientPhoneNumber) => {
        return new Promise((resolve, reject) => {
          // create a verification request with your
          // sms/verification provider
        })
      },
      verifySmsVerificationRequest: (verificationId, otp) => {
        return new Promise((resolve, reject) => {
          // verify with your sms/verification provider
          // that the verification id and otp pair is valid
        })
      },
    }),
],
...
```
See the [SMS provider documentation](/providers/sms) for more information on how to configure SMS sign in.

:::note
SMS provider is currently only supported when using JWT sessions. It does not store any user data in the database.
:::

:::note
Since this is different than all other authentication flows that primarily use emails, it is strongly recommended that you override the [callbacks](https://next-auth.js.org/configuration/callbacks) in your `[...nextauth].js` to make sure that the session object is not empty upon logging in. 
:::

### Options

|          Name           |                                     Description                                     |               Type               | Required |
| :---------------------: | :---------------------------------------------------------------------------------: | :------------------------------: | :------: |
|           id            |                             Unique ID for the provider                              |             `string`             |   Yes    |
|          name           |                          Descriptive name for the provider                          |             `string`             |   Yes    |
|          type           |                       Type of provider, in this case `sms`                        |            `"sms"`             |   Yes    |
| sendSmsVerificationRequest |               Callback to execute when a verification request is sent               | `(recipientPhoneNumber) => Promise<string>` |   Yes    |
| verifySmsVerificationRequest |               Callback to execute when a user enters OTP              | `(verificationId, otp) => Promise<{ phone: string, id: string }>` |   Yes    |
|         maxAge          | How long should the sent OTP and the verification ID cookie be valid. Defaults to 2 minutes. Should align with the configuration used in SMS/Verification provider |             `number`             |    No    |
---
id: sms
title: SMS
---

## Overview
The SMS provider allows you to login with your phone instead of your email. Once you request to login, your phone will receive a One Time Password (OTP) that you will need to enter in order to be able to sign in. 

Adding support for signing in via phones is useful in the following scenarios, which can be found in [this particular GitHub issue](https://github.com/nextauthjs/next-auth/issues/1562). Quote:

- Some groups of users, particularly those with poor digital skills, will find it easier to verify their identity with an SMS rather than an email.

- Sometimes, an organiser for let's say a community or a group of volunteers may only have phone numbers for the users, rather than email addresses.

:::tip
SMS provider is currently only supported when using JWT sessions. It does not store any user data in the database.
:::

:::tip
Since this is different than all other authentication flows that primarily use emails, it is strongly recommended that you override the [callbacks](https://next-auth.js.org/configuration/callbacks) in your `[...nextauth].js` to make sure that the session object is not empty upon logging in. 
:::

### How it works
On initial signin, a **One Time Password (OTP)** is sent to your provided phone number. The workflow is heavily dependent on the SMS/Verification provider that you use, albeit with the following common principles:

- Your SMS/Verification provider is able to issue a verification ID when a user creates a verification request by supplying his/her phone number on initial login.
- The user receives a secret token (OTP) on his/her phone from the SMS/Verification provider.
- Simultaneously, the user will be redirected to a new page which will prompt him/her to enter the OTP s/he received on his/her phone.
- Your SMS/Verification provider is able to verify a verification request given the verification ID paired with the token/OTP.

Such providers include, but are not limited to:

- [MessageBird](https://developers.messagebird.com/api/verify/)
- [Twilio](https://www.twilio.com/docs/verify/api)


## Options
The SMS provider comes with the following set of options.

```js
export default function SMS(options) {
  return {
    maxAge: 2 * 60,
    sendSmsVerificationRequest: null,
    verifySmsVerificationRequest: null,
    ...options,
    id: "sms",
    type: "sms",
    name: "SMS",
  }
}
```

You must override the following:

- `sendSmsVerificationRequest`: This function will use your choice of SMS/Verification provider and create a verification request. It should return the verification ID.

- `verifySmsVerificationRequest`: This function should issue a request to your SMS/Verification provider to determine whether a pair of verification ID and OTP is valid.

## Configuration

The following configuration guideline will use MessageBird as example, however, you can use any other SMS/Verification provider, and the steps should roughly be the same.

1. You will need to register an account with your choice of SMS/Verification provider. Upon registering, you should receive some sort of credentials e.g. `ACCESS_KEYS` or `SID` and `AUTH_TOKEN` which you can use to make calls to your SMS/Verification provider's APIs. You should store them in your `.env` file.

```env
SMS_PROVIDER_ACCESS_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXX
SMS_PROVIDER_SMS_ORIGINATOR=XXXXXXXXXX # the phone number that you registered to send SMS
```
2. Now, you can start implementing the SMS provider options in your `[...nextauth].js` file. Here, we are referring to the [MessageBird documentation](https://developers.messagebird.com/api/verify/).

```js
import NextAuth from "next-auth"
import SMSProvider from "next-auth/providers/sms"
import messagebird from "messagebird"

const messagebirdClient = messagebird(process.env.SMS_PROVIDER_ACCESS_TOKEN)

export default NextAuth({
  session: {
    jwt: true,
  },
  secret: process.env.SESSION_SECRET,
  providers: [
    SMSProvider({
      maxAge: 5 * 60 * 60,
      sendSmsVerificationRequest: (recipientPhoneNumber) => {
        return new Promise((resolve, reject) => {
          var params = {
            originator: process.env.SMS_PROVIDER_SMS_ORIGINATOR,
            timeout: 5 * 60 * 60,
          }

          messagebirdClient.verify.create(
            recipientPhoneNumber,
            params,
            function (err, response) {
              if (err) {
                return reject(err)
              }

              resolve(response.id)
            }
          )
        })
      },
      verifySmsVerificationRequest: (verificationId, otp) => {
        return new Promise((resolve, reject) => {
          messagebirdClient.verify.verify(
            verificationId, 
            otp, 
            function (err, response) {
              if (err) {
                return reject(err)
              }
              resolve({
                phone: response.recipient,
                id: response.id,
              })
            }
          )
        })
      },
    }),

    // other providers
  ]
})
```

- `sendSmsVerificationRequest` will be called when the user attempts a login using his/her phone. Hence, you need the function to accept a phone number parameter. You can run additional validations here, e.g. checking country codes. If the verification request is successfully created, this function should return the ID of the created verification request, which may look something like: `xxxxxx01155d1e35a9d9571v00xxxxxx`. 

- `verifySmsVerificationRequest` will be called once the user has entered the OTP in the verification page on your application. As such, it takes the verification ID and the OTP supplied by the user as parameters. Then, it tries to verify the pair of inputs. If the verification succeeds, you need to return an object that contains the phone number and verification ID of the response, as well as any other information you may want from the verification payload.

:::tip
Behind the scenes, NextAuth will store the verification ID returned from the `sendSmsVerificationRequest` function as a `HttpOnly` cookie on the browser, which will only be sent with the request to the server that carries the OTP in the request payload. The cookie will be set to expire in the number of seconds provided in the `maxAge` property or 2 minutes if undefined.
:::


## Customization
- Since you are relying on a third-party SMS/Verification provider, any customizations e.g. length of the OTP can only be possible if your provider supports it.
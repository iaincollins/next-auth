import NextAuth from "next-auth"
import EmailProvider from "next-auth/providers/email"
import GitHubProvider from "next-auth/providers/github"
import Auth0Provider from "next-auth/providers/auth0"
import TwitterProvider from "next-auth/providers/twitter"
import CredentialsProvider from "next-auth/providers/credentials"

export default NextAuth({
  // Used to debug https://github.com/nextauthjs/next-auth/issues/1664
  // cookies: {
  //   csrfToken: {
  //     name: 'next-auth.csrf-token',
  //     options: {
  //       httpOnly: true,
  //       sameSite: 'none',
  //       path: '/',
  //       secure: true
  //     }
  //   },
  //   pkceCodeVerifier: {
  //     name: 'next-auth.pkce.code_verifier',
  //     options: {
  //       httpOnly: true,
  //       sameSite: 'none',
  //       path: '/',
  //       secure: true
  //     }
  //   }
  // },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Auth0Provider({
      clientId: process.env.AUTH0_ID,
      clientSecret: process.env.AUTH0_SECRET,
      domain: process.env.AUTH0_DOMAIN,
      checks: ["pkce", "state"],
      // params: {
      //   response_mode: "form_post",
      // },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (credentials.password === "password") {
          return {
            id: 1,
            name: "Fill Murray",
            email: "bill@fillmurray.com",
            image: "https://www.fillmurray.com/64/64",
          }
        }
        return null
      },
    }),
  ],
  jwt: {
    encryption: true,
    secret: process.env.SECRET,
  },
  debug: true,
  theme: "auto",
})

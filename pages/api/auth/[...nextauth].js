import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'

// import Adapters from 'next-auth/adapters'
// import { PrismaClient } from '@prisma/client'
// const prisma = new PrismaClient()

export default NextAuth({
  providers: [
    Providers.Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM
    }),
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET
    }),
    Providers.Auth0({
      clientId: process.env.AUTH0_ID,
      clientSecret: process.env.AUTH0_SECRET,
      domain: process.env.AUTH0_DOMAIN,
      protection: 'pkce'
    }),
    Providers.Twitter({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET
    }),
    Providers.Credentials({
      name: 'Credentials',
      credentials: {
        password: {
          // label: 'Password',
          // If multi-locale, you can pass translations:
          label: {
            en: 'Password',
            es: 'Password in Spanish'
          },
          type: 'password'
        }
      },
      async authorize (credentials) {
        if (credentials.password === 'password') {
          return {
            id: 1,
            name: 'Fill Murray',
            email: 'bill@fillmurray.com',
            image: 'https://www.fillmurray.com/64/64'
          }
        }
        return null
      }
    })
  ],
  locales: {
    // Override default translations per-locale if needed
    es: {
      signIn: {
        title: 'Sign In (in Spanish)',
        email: 'Email in Spanish',
        errors: {
          OAuthSignin: 'Try signing with a different account in Spanish.'
        }
      },
      // You can override default verification request email texts as well
      email: {
        subject: 'Sign in to %s (in Spanish)',
        html: {
          signIn: 'Sign in (in Spanish)'
        }
      }
    }
  },
  jwt: {
    encryption: true,
    secret: process.env.SECRET
  },
  debug: false,
  theme: 'auto'

  // Default Database Adapter (TypeORM)
  // database: process.env.DATABASE_URL

  // Prisma Database Adapter
  // To configure this app to use the schema in `prisma/schema.prisma` run:
  // npx prisma generate
  // npx prisma migrate dev --preview-feature
  // adapter: Adapters.Prisma.Adapter({ prisma })
})

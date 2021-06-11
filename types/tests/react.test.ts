import * as client from "../react-client"
import { nextReq } from "./test-helpers"

const clientSession = {
  user: {
    name: "Bruce",
    email: "bruce@lee.com",
    image: "path/to/img",
  },
  accessToken: "123z",
  expires: "1234",
}

// $ExpectType [Session | null, boolean]
client.useSession()

// $ExpectType Promise<Session | null>
client.getSession({ req: nextReq })

// $ExpectType Promise<Record<string, ClientSafeProvider> | null>
client.getProviders()

// $ExpectType Promise<string | null>
client.getCsrfToken({ req: nextReq })

// $ExpectType Promise<string | null>
client.getCsrfToken({ ctx: { req: nextReq } })

// $ExpectType Promise<undefined>
client.signIn("github", { callbackUrl: "foo" }, { login: "username" })

// $ExpectType Promise<SignInResponse | undefined>
client.signIn("credentials", { callbackUrl: "foo", redirect: true })

// $ExpectType Promise<SignInResponse | undefined>
client.signIn("credentials", { redirect: false })

// $ExpectType Promise<SignInResponse | undefined>
client.signIn("email", { callbackUrl: "foo", redirect: false })

// $ExpectType Promise<SignInResponse | undefined>
client.signIn("email", { callbackUrl: "foo", redirect: true })

// $ExpectType Promise<undefined>
client.signOut()

// $ExpectType Promise<undefined>
client.signOut({ callbackUrl: "https://foo.com/callback", redirect: true })

// $ExpectType Promise<SignOutResponse>
client.signOut({ callbackUrl: "https://foo.com/callback", redirect: false })

// $ExpectType ReactElement<any, any> | null
client.SessionProvider({
  children: null,
  session: clientSession,
  baseUrl: "https://foo.com",
  basePath: "/",
  staleTime: 1234,
})

// $ExpectType ReactElement<any, any> | null
client.SessionProvider({
  children: null,
  session: clientSession,
})

// $ExpectType ReactElement<any, any> | null
client.SessionProvider({
  children: null,
})

// $ExpectType ReactElement<any, any> | null
client.SessionProvider({
  children: null,
  session: {
    expires: "",
  },
  baseUrl: "https://foo.com",
  basePath: "/",
  staleTime: 1234,
  refetchInterval: 4321,
})
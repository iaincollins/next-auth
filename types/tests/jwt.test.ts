import * as JWTType from "next-auth/jwt"
import { nextReq } from "./test-helpers"

// $ExpectType Promise<string>
JWTType.encode({
  token: { key: "value" },
  secret: "secret",
})

// $ExpectType Promise<JWT | null>
JWTType.decode({
  token: "token",
  secret: "secret",
})

// $ExpectType Promise<string>
JWTType.getToken({
  req: nextReq,
  raw: true,
})

// $ExpectType Promise<JWT | null>
JWTType.getToken({
  req: nextReq,
  secret: "secret",
})

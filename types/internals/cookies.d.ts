// REVIEW: Is there any way to defer two types of strings?

/** Stringified form of `JWT`. Extract the content with `jwt.decode` */
export type JWTString = string

/** If `options.session.jwt` is set to `true`, this is a stringified `JWT`. In case of a database persisted session, this is the `sessionId` of the session in the database.. */
export type SessionToken<T extends "jwt" | "db" = "jwt"> = T extends "jwt"
  ? JWTString
  : string

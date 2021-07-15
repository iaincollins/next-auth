import { setupServer } from "msw/node"
import { rest } from "msw"
import { randomBytes } from "crypto"

export const mockSession = {
  ok: true,
  user: {
    image: null,
    name: "John",
    email: "john@email.com",
  },
  expires: 123213139,
}

export const mockProviders = {
  ok: true,
  sms: {
    id: "sms",
    name: "SMS",
    type: "sms",
    signinUrl: "path/to/signin",
    callbackUrl: "path/to/callback",
  },
  github: {
    id: "github",
    name: "Github",
    type: "oauth",
    signinUrl: "path/to/signin",
    callbackUrl: "path/to/callback",
  },
  credentials: {
    id: "credentials",
    name: "Credentials",
    type: "credentials",
    authorize: null,
    credentials: null,
  },
  email: {
    id: "email",
    type: "email",
    name: "Email",
  },
}

export const mockCSRFToken = {
  ok: true,
  csrfToken: randomBytes(32).toString("hex"),
}

export const mockGithubResponse = {
  ok: true,
  status: 200,
  url: "https://path/to/github/url",
}

export const mockCredentialsResponse = {
  ok: true,
  status: 200,
  url: "https://path/to/credentials/url",
}

export const mockEmailResponse = {
  ok: true,
  status: 200,
  url: "https://path/to/email/url",
}

export const mockSignOutResponse = {
  ok: true,
  status: 200,
  url: "https://path/to/signout/url",
}

export const server = setupServer(
  rest.post("/api/auth/signout", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockSignOutResponse))
  ),
  rest.get("/api/auth/session", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockSession))
  ),
  rest.get("/api/auth/csrf", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockCSRFToken))
  ),
  rest.get("/api/auth/providers", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockProviders))
  ),
  rest.post("/api/auth/signin/github", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockGithubResponse))
  ),
  rest.post("/api/auth/callback/credentials", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockCredentialsResponse))
  ),
  rest.post("/api/auth/signin/email", (req, res, ctx) =>
    res(ctx.status(200), ctx.json(mockEmailResponse))
  ),
  rest.post("/api/auth/_log", (req, res, ctx) => res(ctx.status(200)))
)

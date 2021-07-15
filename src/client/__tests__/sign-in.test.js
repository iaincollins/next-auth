import { useState } from "react"
import { randomBytes } from "crypto"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor } from "@testing-library/react"
import logger from "../../lib/logger"
import {
  server,
  mockCredentialsResponse,
  mockEmailResponse,
  mockGithubResponse,
} from "./helpers/mocks"
import { signIn } from ".."
import { rest } from "msw"

const { location } = window

jest.mock("../../lib/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
  proxyLogger(logger) {
    return logger
  },
}))

beforeAll(() => {
  server.listen()
  delete window.location
  window.location = {
    ...location,
    replace: jest.fn(),
    reload: jest.fn(),
  }
})

beforeEach(() => {
  jest.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  window.location = location
  server.close()
})

const callbackUrl = "https://redirects/to"

test.each`
  provider | type
  ${""}    | ${"no"}
  ${"foo"} | ${"unknown"}
`(
  "if $type provider, it redirects to the default sign-in page",
  async ({ provider }) => {
    render(<SignInFlow providerId={provider} callbackUrl={callbackUrl} />)

    userEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledTimes(1)
      expect(window.location.replace).toHaveBeenCalledWith(
        `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      )
    })
  }
)

test.each`
  provider | type
  ${""}    | ${"no"}
  ${"foo"} | ${"unknown"}
`(
  "if $type provider supplied and no callback URL, redirects using the current location",
  async ({ provider }) => {
    render(<SignInFlow providerId={provider} />)

    userEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledTimes(1)
      expect(window.location.replace).toHaveBeenCalledWith(
        `/api/auth/signin?callbackUrl=${encodeURIComponent(
          window.location.href
        )}`
      )
    })
  }
)

test.each`
  provider         | mockUrl
  ${`email`}       | ${mockEmailResponse.url}
  ${`credentials`} | ${mockCredentialsResponse.url}
`(
  "$provider provider redirects if `redirect` is `true`",
  async ({ provider, mockUrl }) => {
    render(<SignInFlow providerId={provider} redirect={true} />)

    userEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledTimes(1)
      expect(window.location.replace).toHaveBeenCalledWith(mockUrl)
    })
  }
)

test("redirection can't be stopped using an oauth provider", async () => {
  render(
    <SignInFlow
      providerId="github"
      callbackUrl={callbackUrl}
      redirect={false}
    />
  )

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledTimes(1)
    expect(window.location.replace).toHaveBeenCalledWith(mockGithubResponse.url)
  })
})

test("redirection can be stopped using the 'credentials' provider", async () => {
  render(
    <SignInFlow
      providerId="credentials"
      callbackUrl={callbackUrl}
      redirect={false}
    />
  )

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).not.toHaveBeenCalledWith(
      mockCredentialsResponse.url
    )

    expect(screen.getByTestId("signin-result").textContent).not.toBe(
      "no response"
    )
  })

  // snapshot the expected return shape from `signIn`
  expect(JSON.parse(screen.getByTestId("signin-result").textContent))
    .toMatchInlineSnapshot(`
    Object {
      "error": null,
      "ok": true,
      "status": 200,
      "url": "https://path/to/credentials/url",
    }
  `)
})

test("redirection can be stopped using the 'email' provider", async () => {
  render(
    <SignInFlow providerId="email" callbackUrl={callbackUrl} redirect={false} />
  )

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).not.toHaveBeenCalledWith(
      mockEmailResponse.url
    )

    expect(screen.getByTestId("signin-result").textContent).not.toBe(
      "no response"
    )
  })

  // snapshot the expected return shape from `signIn` oauth
  expect(JSON.parse(screen.getByTestId("signin-result").textContent))
    .toMatchInlineSnapshot(`
    Object {
      "error": null,
      "ok": true,
      "status": 200,
      "url": "https://path/to/email/url",
    }
  `)
})

test("if callback URL contains a hash we force a window reload when re-directing", async () => {
  const mockUrlWithHash = "https://path/to/email/url#foo-bar-baz"

  server.use(
    rest.post("/api/auth/signin/email", (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          ...mockEmailResponse,
          url: mockUrlWithHash,
        })
      )
    })
  )

  render(<SignInFlow providerId="email" callbackUrl={mockUrlWithHash} />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledTimes(1)
    expect(window.location.replace).toHaveBeenCalledWith(mockUrlWithHash)
    // the browser will not refresh the page if the redirect URL contains a hash, hence we force it on the client, see #1289
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })
})

test("params are propagated to the signin URL when supplied", async () => {
  let matchedParams = ""
  const authParams = "foo=bar&bar=foo"

  server.use(
    rest.post("/api/auth/signin/github", (req, res, ctx) => {
      matchedParams = req.url.search
      return res(ctx.status(200), ctx.json(mockGithubResponse))
    })
  )

  render(<SignInFlow providerId="github" authorizationParams={authParams} />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(matchedParams).toEqual(`?${authParams}`)
  })
})

test("when it fails to fetch the providers, it redirected back to signin page", async () => {
  const errorMsg = "Error when retrieving providers"

  server.use(
    rest.get("/api/auth/providers", (req, res, ctx) =>
      res(ctx.status(500), ctx.json(errorMsg))
    )
  )

  render(<SignInFlow providerId="github" />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledWith(`/api/auth/error`)

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toBeCalledWith(
      "CLIENT_FETCH_ERROR",
      "providers",
      errorMsg
    )
  })
})

test("when user does not provide a phone number, it redirects to error page", async () => {
  const sendSmsVerificationRequest = jest
    .fn()
    .mockImplementationOnce(async (recepientNumber) =>
      Promise.reject(new Error("Recipient not defined"))
    )

  server.use(
    rest.post("/api/auth/signin/sms", async (req, res, ctx) => {
      try {
        await sendSmsVerificationRequest()
      } catch {
        return res(
          ctx.status(500),
          ctx.json({
            url: "/api/auth/error",
          })
        )
      }
    })
  )

  render(<SignInFlow providerId="sms" />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledWith(`/api/auth/error`)
    expect(sendSmsVerificationRequest).toHaveBeenCalledTimes(1)
    expect(sendSmsVerificationRequest).toBeCalledWith()
  })
})

test("when user provides a phone number, it should redirect to verify-request page", async () => {
  const sendSmsVerificationRequest = jest
    .fn()
    .mockImplementationOnce(async (recepientNumber) =>
      Promise.resolve(randomBytes(16).toString("hex"))
    )

  const phone = "01234567890"

  server.use(
    rest.post("/api/auth/signin/sms", async (req, res, ctx) => {
      await sendSmsVerificationRequest(req.body.get("phone"))
      return res(ctx.status(200), ctx.json({ url: `/api/auth/verify-request` }))
    })
  )

  render(<SignInFlow providerId="sms" data={{ phone }} />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledWith(
      "/api/auth/verify-request"
    )
    expect(sendSmsVerificationRequest).toHaveBeenCalledTimes(1)
    expect(sendSmsVerificationRequest).toHaveBeenCalledWith(phone)
  })
})

function SignInFlow({
  providerId,
  callbackUrl,
  redirect = true,
  data = {},
  authorizationParams = {},
}) {
  const [response, setResponse] = useState(null)

  async function handleSignIn() {
    const result = await signIn(
      providerId,
      {
        callbackUrl,
        redirect,
        ...data,
      },
      authorizationParams
    )

    setResponse(result)
  }

  return (
    <>
      <p data-testid="signin-result">
        {response ? JSON.stringify(response) : "no response"}
      </p>
      <button onClick={handleSignIn}>Sign in</button>
    </>
  )
}

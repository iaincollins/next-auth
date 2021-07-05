import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, waitFor } from "@testing-library/react"
import { server, mockSignOutResponse } from "./helpers/mocks"
import { signOut } from "../react"
import { rest } from "msw"
import { getBroadcastEvents } from "./helpers/utils"

const { location } = window

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
  // eslint-disable-next-line no-proto
  jest.spyOn(window.localStorage.__proto__, "setItem")
})

afterEach(() => {
  jest.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  window.location = location
  server.close()
})

const callbackUrl = "https://redirects/to"

test("by default it redirects to the current URL if the server did not provide one", async () => {
  server.use(
    rest.post("/api/auth/signout", (req, res, ctx) =>
      res(ctx.status(200), ctx.json({ ...mockSignOutResponse, url: undefined }))
    )
  )

  render(<SignOutFlow />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledTimes(1)
    expect(window.location.replace).toHaveBeenCalledWith(window.location.href)
  })
})

test("it redirects to the URL allowed by the server", async () => {
  render(<SignOutFlow callbackUrl={callbackUrl} />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.replace).toHaveBeenCalledTimes(1)
    expect(window.location.replace).toHaveBeenCalledWith(
      mockSignOutResponse.url
    )
  })
})

test("if url contains a hash during redirection a page reload happens", async () => {
  const mockUrlWithHash = "https://path/to/email/url#foo-bar-baz"

  server.use(
    rest.post("/api/auth/signout", (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          ...mockSignOutResponse,
          url: mockUrlWithHash,
        })
      )
    })
  )

  render(<SignOutFlow />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    expect(window.location.reload).toHaveBeenCalledTimes(1)
    expect(window.location.replace).toHaveBeenCalledWith(mockUrlWithHash)
  })
})

test("will broadcast the signout event to other tabs", async () => {
  render(<SignOutFlow />)

  userEvent.click(screen.getByRole("button"))

  await waitFor(() => {
    const broadcastCalls = getBroadcastEvents()
    const [broadcastedEvent] = broadcastCalls

    expect(broadcastCalls).toHaveLength(1)
    expect(broadcastedEvent.eventName).toBe("nextauth.message")
    expect(broadcastedEvent.value).toStrictEqual({ reason: "signOut" })
  })
})

function SignOutFlow({ callbackUrl, redirect = true }) {
  const [response, setResponse] = useState(null)

  async function handleSignOut() {
    const result = await signOut({ callbackUrl, redirect })
    setResponse(result)
  }

  return (
    <>
      <p data-testid="signout-result">
        {response ? JSON.stringify(response) : "no response"}
      </p>
      <button onClick={handleSignOut}>Sign out</button>
    </>
  )
}

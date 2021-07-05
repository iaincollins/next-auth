import { render, screen, waitFor } from "@testing-library/react"
import { rest } from "msw"
import { server, mockSession } from "./helpers/mocks"
import logger from "../../lib/logger"
import { useState, useEffect } from "react"
import { getSession } from "../react"
import { getBroadcastEvents } from "./helpers/utils"

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

beforeAll(() => server.listen())

beforeEach(() => {
  // eslint-disable-next-line no-proto
  jest.spyOn(window.localStorage.__proto__, "setItem")
})

afterEach(() => {
  server.resetHandlers()
  jest.clearAllMocks()
})

afterAll(() => {
  server.close()
})

test("if it can fetch the session, it should store it in `localStorage`", async () => {
  render(<SessionFlow />)

  // In the start, there is no session
  const noSession = await screen.findByText("No session")
  expect(noSession).toBeInTheDocument()

  // After we fetched the session, it should have been rendered by `<SessionFlow />`
  const session = await screen.findByText(new RegExp(mockSession.user.name))
  expect(session).toBeInTheDocument()

  const broadcastCalls = getBroadcastEvents()
  const [broadcastedEvent] = broadcastCalls

  expect(broadcastCalls).toHaveLength(1)
  expect(broadcastCalls).toHaveLength(1)
  expect(broadcastedEvent.eventName).toBe("nextauth.message")
  expect(broadcastedEvent.value).toStrictEqual({ reason: "getSession" })
})

test("if there's an error fetching the session, it should log it", async () => {
  server.use(
    rest.get("/api/auth/session", (req, res, ctx) => {
      return res(ctx.status(500), ctx.body("Server error"))
    })
  )

  render(<SessionFlow />)

  await waitFor(() => {
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toBeCalledWith(
      "CLIENT_FETCH_ERROR",
      "session",
      new SyntaxError("Unexpected token S in JSON at position 0")
    )
  })
})

function SessionFlow() {
  const [session, setSession] = useState(null)
  useEffect(() => {
    async function fetchUserSession() {
      try {
        const result = await getSession()
        setSession(result)
      } catch (e) {
        console.error(e)
      }
    }
    fetchUserSession()
  }, [])

  if (session) return <pre>{JSON.stringify(session, null, 2)}</pre>

  return <p>No session</p>
}

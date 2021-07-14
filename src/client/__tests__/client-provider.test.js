import { rest } from "msw"
import { render, screen, waitFor } from "@testing-library/react"
import { server, mockSession } from "./helpers/mocks"
import { SessionProvider, useSession } from "../react"

const origDocumentVisibility = document.visibilityState

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  jest.clearAllMocks()
  server.resetHandlers()
  changeTabVisibility(origDocumentVisibility)
})

afterAll(() => {
  server.close()
})

test("it won't allow to fetch the session in isolation without a session context", () => {
  function App() {
    useSession()
    return null
  }

  jest.spyOn(console, "error")
  console.error.mockImplementation(() => {})

  expect(() => render(<App />)).toThrow(
    "useSession must be wrapped in a SessionProvider"
  )

  console.error.mockRestore()
})

test("fetches the session once and re-uses it for different consumers", async () => {
  const sessionRouteSpy = jest.fn()

  server.use(
    rest.get("/api/auth/session", (req, res, ctx) => {
      sessionRouteSpy()
      res(ctx.status(200), ctx.json(mockSession))
    })
  )

  render(<ProviderFlow />)

  expect(screen.getByTestId("session-consumer-1")).toHaveTextContent("loading")
  expect(screen.getByTestId("session-consumer-2")).toHaveTextContent("loading")

  await waitFor(() => {
    expect(sessionRouteSpy).toHaveBeenCalledTimes(1)

    const session1 = screen.getByTestId("session-consumer-1").textContent
    const session2 = screen.getByTestId("session-consumer-2").textContent

    expect(session1).toEqual(session2)
  })
})

test("when there's an existing session, it won't initialize as loading", async () => {
  const sessionRouteSpy = jest.fn()

  server.use(
    rest.get("/api/auth/session", (req, res, ctx) => {
      sessionRouteSpy()
      res(ctx.status(200), ctx.json(mockSession))
    })
  )

  /**
   * TODO: How can we force a clean session state between tests? At the moment
   *       the library uses this internal constant: __NEXTAUTH to track calls
   *       and we can't clean it between tests.
   */
  render(<ProviderFlow session={mockSession} />)

  expect(sessionRouteSpy).not.toHaveBeenCalled()
})

test("will refetch the session when the browser tab becomes active again", async () => {
  const sessionRouteSpy = jest.fn()

  server.use(
    rest.get("/api/auth/session", (req, res, ctx) => {
      sessionRouteSpy()
      res(ctx.status(200), ctx.json(mockSession))
    })
  )

  render(<ProviderFlow session={mockSession} />)

  await waitFor(() => {
    expect(sessionRouteSpy).not.toHaveBeenCalled()
  })

  // Hide the current tab
  changeTabVisibility("hidden")

  // Given the current tab got hidden, it should not attempt to re-fetch the session
  await waitFor(() => {
    expect(sessionRouteSpy).not.toHaveBeenCalled()
  })

  // Make the tab again visible
  changeTabVisibility("visible")

  // Given the user made the tab visible again, now attempts to sync and re-fetch the session
  await waitFor(() => {
    expect(sessionRouteSpy).toHaveBeenCalledTimes(1)
  })
})

test.todo(
  "will refetch the session if told to do so programmatically from another window"
)

test.todo(
  "allows to customize how often the session will be re-fetched through polling"
)

test.todo("allows to customize the URL for session fetching")

test.todo("allows to customize session stale time")

function ProviderFlow(props) {
  return (
    <SessionProvider {...options}>
      <SessionConsumer />
      <SessionConsumer testId="2" />
    </SessionProvider>
  )
}

function SessionConsumer({ testId = 1 }) {
  const { data: session, status } = useSession()

  return (
    <div data-testid={`session-consumer-${testId}`}>
      {status === "loading" ? "loading" : JSON.stringify(session)}
    </div>
  )
}

function changeTabVisibility(status) {
  const visibleStates = ["visible", "hidden"]

  if (!visibleStates.includes(status)) return

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: status,
  })

  document.dispatchEvent(new Event("visibilitychange"))
}

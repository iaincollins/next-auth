import * as React from "react"
import { Session } from ".."

interface BroadcastMessage {
  reason: "signOut" | "getSession"
  clientId: string
  timestamp: number
}

export type BroadcastChannel = () => {
  /**
   * Takes a callback that is triggered whenever an event occurrs in another tab/window
   * Returns a method to stop listening for events.
   */
  receive(onReceive: (message: BroadcastMessage) => void): () => void
  /** Triggers an event on all tabs/events that are listening */
  post(message: BroadcastMessage): void
}

export interface NextAuthConfig {
  baseUrl: string
  basePath: string
  baseUrlServer: string
  basePathServer: string
  /** Stores last session response */
  _session?: Session | null
  /** Used for timestamp since last sycned (in seconds) */
  _lastSync: number
  /**
   * Stores the `SessionProvider`'s session update method to be able to
   * trigger session updates from places like `signIn` or `signOut`
   */
  _getSession(params: { event?: string }): void
}

export type SessionContext = React.Context<Session>

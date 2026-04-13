/// <reference types="vite/client" />

import type { EndpointConfig, ServerStatusPayload, StartServerResult } from './types'

declare global {
  interface Window {
    electronAPI?: {
      startServer: (config: EndpointConfig[]) => Promise<StartServerResult>
      stopServer: () => Promise<{ status: string }>
      onServerStatus: (callback: (data: ServerStatusPayload) => void) => () => void
    }
  }
}

export {}

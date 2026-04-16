export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const HTTP_METHODS: HttpMethod[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'email'
  | 'uuid'
  | 'date'
  | 'name'
  | 'lorem'
  | 'lorem_paragraph'
  | 'slug'
  | 'url'
  | 'picsum'

export interface SchemaField {
  name: string
  type: SchemaFieldType
}

export type EndpointResponseMode = 'schema' | 'sampleJson'

/** Named response example (Postman-style); used when `responseSource` is `example`. */
export interface EndpointExample {
  name: string
  /** JSON body as string */
  body: string
}

export interface EndpointConfig {
  path: string
  schema: SchemaField[]
  /** How to build mock responses. Defaults to `schema` when omitted. */
  responseMode?: EndpointResponseMode
  /** Response body JSON text; used when `responseMode` is `sampleJson` (Advanced mode). */
  sampleJson?: string
  /** Per-route HTTP method; falls back to global `requestMethod` when omitted. */
  method?: HttpMethod
  /** Artificial delay before responding (ms). */
  delayMs?: number
  /** Override HTTP status (defaults by method: GET/HEAD 200, POST 201, PUT/PATCH 200, DELETE 204). */
  httpStatus?: number
  /** Serve a named example body vs generated mock data. */
  responseSource?: 'generated' | 'example'
  /** Active example index when `responseSource` is `example`. */
  activeExampleIndex?: number
  examples?: EndpointExample[]
}

export interface ServerStatusPayload {
  status: 'running' | 'stopped' | 'error'
  port?: number
  baseUrl?: string
  error?: string
}

export interface StartServerResult {
  status: 'running' | 'error'
  port?: number
  baseUrl?: string
  error?: string
}

/** How mock list/object values are generated for the mock HTTP server. */
export type MockDataMode = 'seeded' | 'random'

/** App shell: mock/schema builder vs HTTP client + import/export. */
export type AppUiMode = 'genApi' | 'queryApi'

export const PERSIST_STATE_VERSION = 5 as const

export interface MockEnvironment {
  id: string
  name: string
  /** Variable values for substitution in paths and {{baseUrl}} in exports. */
  variables: Record<string, string>
}

export interface MockCollection {
  id: string
  name: string
  endpoints: EndpointConfig[]
}

export interface MockWorkspace {
  id: string
  name: string
  collections: MockCollection[]
}

/** Full app state persisted to SQLite (v5). */
export interface PersistedAppState {
  version: typeof PERSIST_STATE_VERSION
  /** Gen API = mock builder; Query API = HTTP client + import/export. */
  uiMode: AppUiMode
  workspaces: MockWorkspace[]
  selectedWorkspaceId: string
  selectedCollectionId: string
  selectedRouteIndex: number
  requestMethod: HttpMethod
  sampleCount: string
  mockDataMode: MockDataMode
  environments: MockEnvironment[]
  selectedEnvironmentId: string
}

export type LoadAppStateResult =
  | {
      ok: true
      data: PersistedAppState | null
      /** Shown once after hydrate (invalid DB row, missing DB, etc.). */
      warning?: string
      /** When true, skip auto-save; local SQLite could not be opened. */
      persistUnavailable?: boolean
    }
  | { ok: false; error: string }

export type SaveAppStateResult = { ok: true } | { ok: false; error: string }

export interface ResponseMeta {
  status: number
  statusText: string
  timeMs: number
  sizeBytes: number
}

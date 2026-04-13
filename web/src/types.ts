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

export interface SchemaField {
  name: string
  type: SchemaFieldType
}

export type EndpointResponseMode = 'schema' | 'sampleJson'

export interface EndpointConfig {
  path: string
  schema: SchemaField[]
  /** How to build mock responses. Defaults to `schema` when omitted. */
  responseMode?: EndpointResponseMode
  /** Example response body (JSON text); used when `responseMode` is `sampleJson`. */
  sampleJson?: string
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

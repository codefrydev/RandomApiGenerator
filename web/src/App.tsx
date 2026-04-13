import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  EndpointConfig,
  EndpointResponseMode,
  SchemaField,
  SchemaFieldType,
  ServerStatusPayload,
  StartServerResult,
} from './types'
import './App.css'
import { schemaToFormattedSampleJson, tryInferFlatSchemaFromSampleJson } from './schemaSync'

const CODEFRYDEV_URL = 'https://codefrydev.in'

const FIELD_TYPES: SchemaFieldType[] = [
  'string',
  'number',
  'integer',
  'float',
  'boolean',
  'email',
  'uuid',
  'date',
  'name',
]

const defaultUsersSchema: SchemaField[] = [
  { name: 'id', type: 'integer' },
  { name: 'name', type: 'name' },
  { name: 'email', type: 'email' },
]

const defaultEndpoints: EndpointConfig[] = [
  {
    path: 'users',
    schema: defaultUsersSchema,
    sampleJson: schemaToFormattedSampleJson(defaultUsersSchema),
  },
]

type ResponseMeta = {
  status: number
  statusText: string
  timeMs: number
  sizeBytes: number
}

function App() {
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>(defaultEndpoints)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [server, setServer] = useState<ServerStatusPayload>({ status: 'stopped' })
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string>('')
  const [rawBody, setRawBody] = useState<string>('')
  const [fetchError, setFetchError] = useState<string>('')
  const [responseMeta, setResponseMeta] = useState<ResponseMeta | null>(null)
  const [schemaTab, setSchemaTab] = useState<'schema' | 'params'>('schema')
  const [bodyView, setBodyView] = useState<'pretty' | 'raw'>('pretty')
  const [sampleCount, setSampleCount] = useState('3')

  const electron = typeof window !== 'undefined' ? window.electronAPI : undefined

  useEffect(() => {
    if (!electron) return
    const off = electron.onServerStatus((data) => setServer(data))
    return off
  }, [electron])

  const selected = endpoints[selectedIndex] ?? endpoints[0]
  const running = server.status === 'running'
  const baseUrl = server.status === 'running' ? server.baseUrl ?? '' : ''
  const pathSegment = selected?.path.replace(/^\/+/, '') ?? ''
  const fullUrl =
    running && baseUrl ? `${baseUrl}/${pathSegment}?count=${encodeURIComponent(sampleCount || '3')}` : ''

  const updateEndpointPath = (index: number, path: string) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => (i === index ? { ...ep, path } : ep)),
    )
  }

  const addEndpoint = () => {
    setEndpoints((prev) => {
      const schema: SchemaField[] = [{ name: 'id', type: 'integer' }]
      const next: EndpointConfig[] = [
        ...prev,
        {
          path: `resource_${prev.length + 1}`,
          schema,
          sampleJson: schemaToFormattedSampleJson(schema),
        },
      ]
      setSelectedIndex(next.length - 1)
      return next
    })
  }

  const removeEndpoint = (index: number) => {
    setEndpoints((prev) => {
      const next = prev.filter((_, i) => i !== index)
      setSelectedIndex((si) => Math.min(si, Math.max(0, next.length - 1)))
      return next
    })
  }

  const addField = (endpointIndex: number) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => {
        if (i !== endpointIndex) return ep
        const schema: SchemaField[] = [
          ...ep.schema,
          { name: `field_${ep.schema.length + 1}`, type: 'string' },
        ]
        return {
          ...ep,
          schema,
          sampleJson: schemaToFormattedSampleJson(schema),
        }
      }),
    )
  }

  const updateField = (
    endpointIndex: number,
    fieldIndex: number,
    patch: Partial<SchemaField>,
  ) => {
    setEndpoints((prev) =>
      prev.map((ep, ei) => {
        if (ei !== endpointIndex) return ep
        const schema = ep.schema.map((f, fi) =>
          fi === fieldIndex ? { ...f, ...patch } : f,
        )
        return {
          ...ep,
          schema,
          sampleJson: schemaToFormattedSampleJson(schema),
        }
      }),
    )
  }

  const removeField = (endpointIndex: number, fieldIndex: number) => {
    setEndpoints((prev) =>
      prev.map((ep, ei) => {
        if (ei !== endpointIndex) return ep
        const schema = ep.schema.filter((_, fi) => fi !== fieldIndex)
        const nextSchema: SchemaField[] = schema.length ? schema : [{ name: 'id', type: 'integer' }]
        return {
          ...ep,
          schema: nextSchema,
          sampleJson: schemaToFormattedSampleJson(nextSchema),
        }
      }),
    )
  }

  const setEndpointResponseMode = (index: number, mode: EndpointResponseMode) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => {
        if (i !== index) return ep
        if (mode === 'sampleJson') {
          const sampleJson =
            ep.sampleJson && ep.sampleJson.trim().length > 0
              ? ep.sampleJson
              : schemaToFormattedSampleJson(ep.schema)
          return {
            ...ep,
            responseMode: 'sampleJson',
            sampleJson,
          }
        }
        const inferred = tryInferFlatSchemaFromSampleJson(ep.sampleJson ?? '')
        return {
          ...ep,
          responseMode: 'schema',
          schema: inferred ?? ep.schema,
        }
      }),
    )
  }

  const updateSampleJson = (index: number, text: string) => {
    setEndpoints((prev) =>
      prev.map((ep, i) => {
        if (i !== index) return ep
        const inferred = tryInferFlatSchemaFromSampleJson(text)
        if (inferred) {
          return {
            ...ep,
            sampleJson: text,
            schema: inferred,
          }
        }
        return { ...ep, sampleJson: text }
      }),
    )
  }

  const responseMode: EndpointResponseMode = selected?.responseMode ?? 'schema'

  const exampleResponseError = useMemo(() => {
    if (responseMode !== 'sampleJson' || !selected) return null
    const raw = selected.sampleJson ?? ''
    if (!raw.trim()) return 'Paste an example response body (JSON) to define the shape.'
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed === null || typeof parsed !== 'object') {
        return 'The example must be a JSON object or array.'
      }
      if (Array.isArray(parsed) && parsed.length === 0) {
        return 'If you use an array, include at least one example item.'
      }
      return null
    } catch {
      return 'Invalid JSON — check commas and quotes.'
    }
  }, [responseMode, selected])

  const handleStart = async () => {
    if (!electron) return
    setBusy(true)
    setPreview('')
    setRawBody('')
    setFetchError('')
    setResponseMeta(null)
    try {
      const result: StartServerResult = await electron.startServer(endpoints)
      if (result.status === 'error') {
        setServer({ status: 'error', error: result.error ?? 'Unknown error' })
      } else {
        setServer({
          status: 'running',
          port: result.port,
          baseUrl: result.baseUrl,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const handleStop = async () => {
    if (!electron) return
    setBusy(true)
    setPreview('')
    setRawBody('')
    setFetchError('')
    setResponseMeta(null)
    try {
      await electron.stopServer()
      setServer({ status: 'stopped' })
    } finally {
      setBusy(false)
    }
  }

  const sendRequest = useCallback(async () => {
    if (server.status !== 'running' || !server.baseUrl || !selected) return
    const path = selected.path.replace(/^\/+/, '')
    const count = Math.min(500, Math.max(1, parseInt(sampleCount, 10) || 3))
    const url = `${server.baseUrl}/${path}?count=${count}`
    setFetchError('')
    setPreview('')
    setRawBody('')
    setResponseMeta(null)
    const t0 = performance.now()
    try {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const t1 = performance.now()
      const text = new TextDecoder().decode(buf)
      setRawBody(text)
      let formatted = text
      try {
        const json = JSON.parse(text) as unknown
        formatted = JSON.stringify(json, null, 2)
      } catch {
        formatted = text
      }
      setPreview(formatted)
      setResponseMeta({
        status: res.status,
        statusText: res.statusText,
        timeMs: Math.round(t1 - t0),
        sizeBytes: buf.byteLength,
      })
      if (!res.ok) {
        setFetchError(`${res.status} ${res.statusText}`)
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
    }
  }, [server, selected, sampleCount])

  return (
    <div className="pm-app">
      <aside className="pm-sidebar" aria-label="Collections">
        <div className="pm-sidebar__brand">
          <a
            className="pm-sidebar__logo-link"
            href={CODEFRYDEV_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="CodeFryDev — codefrydev.in"
          >
            <span className="pm-sidebar__logo-mark">
              <img
                src="/codefrydev-icon.svg"
                width={28}
                height={28}
                alt=""
                decoding="async"
              />
            </span>
          </a>
          <div className="pm-sidebar__brand-text">
            <span className="pm-sidebar__title">Random API</span>
            <span className="pm-sidebar__subtitle">codefrydev.in</span>
          </div>
        </div>

        <div className="pm-sidebar__section">
          <div className="pm-sidebar__section-head">
            <span className="pm-sidebar__section-label">Collections</span>
            <button
              type="button"
              className="pm-sidebar__new"
              onClick={addEndpoint}
              disabled={running}
            >
              + New
            </button>
          </div>
          <ul className="pm-sidebar__list">
            {endpoints.map((ep, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`pm-sidebar__item ${i === selectedIndex ? 'pm-sidebar__item--active' : ''}`}
                  onClick={() => setSelectedIndex(i)}
                >
                  <span className="pm-method-tag">GET</span>
                  <span className="pm-sidebar__path">{ep.path || '/'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="pm-sidebar__footer">
          <a
            className="pm-sidebar__cfd"
            href={CODEFRYDEV_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="pm-sidebar__cfd-icon"
              src="/codefrydev-icon.svg"
              width={18}
              height={18}
              alt=""
            />
            <span className="pm-sidebar__cfd-text">CodeFryDev</span>
          </a>
          {electron ? (
            <span className="pm-sidebar__hint">Desktop mock server</span>
          ) : (
            <span className="pm-sidebar__hint pm-sidebar__hint--warn">Run via Electron</span>
          )}
        </div>
      </aside>

      <main className="pm-main">
        <header className="pm-titlebar">
          <div className="pm-titlebar__breadcrumb">
            <span className="pm-titlebar__workspace">Random API Generator · CodeFryDev</span>
            <span className="pm-titlebar__sep">/</span>
            <span className="pm-titlebar__req">{selected?.path || 'request'}</span>
          </div>
        </header>

        {!electron && (
          <div className="pm-banner" role="status">
            Electron API unavailable. Use <code>npm run dev</code> for the full desktop app.
          </div>
        )}

        <div
          className={`pm-server-bar ${busy ? 'pm-server-bar--busy' : ''}`}
          aria-busy={busy}
        >
          <div
            className="pm-server-bar__status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              className={`pm-dot ${running ? 'pm-dot--on' : server.status === 'error' ? 'pm-dot--err' : ''}`}
              aria-hidden="true"
            />
            <span className="pm-server-bar__label">
              {running && server.baseUrl
                ? server.baseUrl
                : server.status === 'error'
                  ? server.error ?? 'Error'
                  : 'Mock server offline'}
            </span>
          </div>
          <div className="pm-server-bar__actions">
            <button
              type="button"
              className="pm-btn pm-btn--ghost"
              disabled={!electron || busy || running || Boolean(exampleResponseError)}
              onClick={() => void handleStart()}
              aria-label={busy ? 'Starting server' : 'Start mock server'}
            >
              Start
            </button>
            <button
              type="button"
              className="pm-btn pm-btn--ghost"
              disabled={!electron || busy || !running}
              onClick={() => void handleStop()}
              aria-label={busy ? 'Stopping server' : 'Stop mock server'}
            >
              Stop
            </button>
          </div>
        </div>

        <section className="pm-request" aria-label="Request">
          <div className="pm-request__row">
            <div className="pm-request__method" title="Method">
              GET
            </div>
            <div className="pm-request__url-wrap">
              <input
                className="pm-request__url"
                readOnly
                value={fullUrl || `${baseUrl || 'http://127.0.0.1:4000'}/${pathSegment}`}
                placeholder="Start the server to build the request URL"
              />
            </div>
            <button
              type="button"
              className="pm-btn pm-btn--send"
              disabled={!running || !electron}
              onClick={() => void sendRequest()}
              aria-label="Send HTTP GET request"
            >
              Send
            </button>
          </div>
          <div className="pm-request__meta">
            <label className="pm-query">
              <span className="pm-query__key">count</span>
              <input
                className="pm-query__val"
                value={sampleCount}
                onChange={(e) => setSampleCount(e.target.value)}
                inputMode="numeric"
                disabled={!running}
                aria-label="Number of sample records (count query parameter)"
              />
            </label>
          </div>
        </section>

        <div className="pm-tabs">
          <button
            type="button"
            className={`pm-tab ${schemaTab === 'schema' ? 'pm-tab--active' : ''}`}
            onClick={() => setSchemaTab('schema')}
          >
            Response
          </button>
          <button
            type="button"
            className={`pm-tab ${schemaTab === 'params' ? 'pm-tab--active' : ''}`}
            onClick={() => setSchemaTab('params')}
          >
            Overview
          </button>
        </div>

        {schemaTab === 'schema' && selected && (
          <section className="pm-schema" aria-label="Response definition">
            <div className="pm-schema__head">
              <span className="pm-schema__path-label">Path segment</span>
              <div className="pm-schema__path-row">
                <span className="pm-schema__slash">/</span>
                <input
                  className="pm-input pm-input--path"
                  value={selected.path}
                  onChange={(e) => updateEndpointPath(selectedIndex, e.target.value)}
                  placeholder="users"
                  disabled={running}
                />
                {endpoints.length > 1 && (
                  <button
                    type="button"
                    className="pm-btn pm-btn--danger-ghost"
                    disabled={running}
                    onClick={() => removeEndpoint(selectedIndex)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="pm-schema__mode">
              <span className="pm-schema__path-label">How to define the response</span>
              <div className="pm-schema__mode-row" role="group" aria-label="Response definition mode">
                <button
                  type="button"
                  className={`pm-mode-btn ${responseMode === 'schema' ? 'pm-mode-btn--active' : ''}`}
                  disabled={running}
                  onClick={() => setEndpointResponseMode(selectedIndex, 'schema')}
                >
                  Field list
                </button>
                <button
                  type="button"
                  className={`pm-mode-btn ${responseMode === 'sampleJson' ? 'pm-mode-btn--active' : ''}`}
                  disabled={running}
                  onClick={() => setEndpointResponseMode(selectedIndex, 'sampleJson')}
                >
                  Example response
                </button>
              </div>
              <p className="pm-schema__mode-hint">
                {responseMode === 'schema'
                  ? 'The field list and example response stay in sync for flat objects (primitive values only). Nested objects or arrays in JSON do not update the table.'
                  : 'Flat objects sync to the field list automatically. Nested shapes only apply in this editor — they do not update the table.'}
              </p>
            </div>

            {responseMode === 'sampleJson' && (
              <div className="pm-example-response">
                <label className="pm-example-response__label" htmlFor={`example-response-${selectedIndex}`}>
                  Example response body (JSON)
                </label>
                <textarea
                  id={`example-response-${selectedIndex}`}
                  className={`pm-textarea ${exampleResponseError ? 'pm-textarea--err' : ''}`}
                  value={selected.sampleJson ?? ''}
                  onChange={(e) => updateSampleJson(selectedIndex, e.target.value)}
                  disabled={running}
                  spellCheck={false}
                  aria-invalid={Boolean(exampleResponseError)}
                  aria-describedby={exampleResponseError ? 'example-response-error' : undefined}
                  rows={14}
                />
                {exampleResponseError && (
                  <p id="example-response-error" className="pm-example-response__error" role="alert">
                    {exampleResponseError}
                  </p>
                )}
              </div>
            )}

            {responseMode === 'schema' && (
              <>
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Type</th>
                      <th className="pm-table__narrow" />
                    </tr>
                  </thead>
                  <tbody>
                    {selected.schema.map((field, fi) => (
                      <tr key={`${field.name}-${fi}`}>
                        <td>
                          <input
                            className="pm-input"
                            value={field.name}
                            onChange={(e) => updateField(selectedIndex, fi, { name: e.target.value })}
                            disabled={running}
                          />
                        </td>
                        <td>
                          <select
                            className="pm-select"
                            value={field.type}
                            onChange={(e) =>
                              updateField(selectedIndex, fi, {
                                type: e.target.value as SchemaFieldType,
                              })
                            }
                            disabled={running}
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pm-icon-btn"
                            title="Remove field"
                            disabled={running || selected.schema.length <= 1}
                            onClick={() => removeField(selectedIndex, fi)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="pm-link"
                  disabled={running}
                  onClick={() => addField(selectedIndex)}
                >
                  + Add field
                </button>
              </>
            )}
          </section>
        )}

        {schemaTab === 'params' && (
          <section className="pm-overview">
            <p>
              Mock REST endpoints are served as <strong>GET</strong> with a <code>count</code>{' '}
              query (1–500). On the <strong>Response</strong> tab, use a <strong>field list</strong>{' '}
              or an <strong>example response</strong> (JSON); start the server, then <strong>Send</strong>{' '}
              to preview.
            </p>
          </section>
        )}

        <section className="pm-response" aria-label="Response">
          <div className="pm-response__head">
            <span className="pm-response__title">Response</span>
            <div className="pm-response__chips">
              {responseMeta && (
                <>
                  <span
                    className={`pm-chip ${responseMeta.status >= 400 ? 'pm-chip--err' : 'pm-chip--ok'}`}
                  >
                    {responseMeta.status} {responseMeta.statusText}
                  </span>
                  <span className="pm-chip pm-chip--muted">{responseMeta.timeMs} ms</span>
                  <span className="pm-chip pm-chip--muted">
                    {(responseMeta.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </>
              )}
            </div>
            <div className="pm-response__tabs">
              <button
                type="button"
                className={`pm-subtab ${bodyView === 'pretty' ? 'pm-subtab--active' : ''}`}
                onClick={() => setBodyView('pretty')}
              >
                Pretty
              </button>
              <button
                type="button"
                className={`pm-subtab ${bodyView === 'raw' ? 'pm-subtab--active' : ''}`}
                onClick={() => setBodyView('raw')}
              >
                Raw
              </button>
            </div>
          </div>
          <div className="pm-response__body">
            {fetchError && !preview && (
              <pre className="pm-code pm-code--err" role="alert">
                {fetchError}
              </pre>
            )}
            {preview && (
              <pre className="pm-code">{bodyView === 'pretty' ? preview : rawBody}</pre>
            )}
            {!preview && !fetchError && (
              <div className="pm-response__empty">
                <p className="pm-response__empty-title">No response yet</p>
                <p className="pm-response__empty-hint">
                  Start the server, then use Send to preview the JSON response body here.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import type { PersistedAppState } from '../types'
import { buildPostmanCollectionV21 } from '../export/postmanCollection'
import { buildOpenApiFromCollection } from '../export/openapiExport'
import { importOpenApiSubset } from '../import/openapiImport'
import { downloadJson, downloadTextFile } from '../lib/download'
import { validateEndpointsConfig } from '../lib/validateEndpointsConfig'
import {
  addEnvironment,
  MAX_ENVIRONMENTS,
  setEnvironmentNameForId,
  setEnvironmentVariable,
  setSelectedEnvironment,
} from '../workspaceModel'
import { parse as parseYaml, stringify } from 'yaml'

export type OverviewSectionProps = {
  tree: PersistedAppState
  setTree: Dispatch<SetStateAction<PersistedAppState>>
  electron: unknown
  persistDisabled: boolean
  lastKnownBaseUrl: string
  runningBaseUrl: string
}

export function OverviewSection({
  tree,
  setTree,
  electron,
  persistDisabled,
  lastKnownBaseUrl,
  runningBaseUrl,
}: OverviewSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importFeedback, setImportFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  )
  const selectedCol = tree.workspaces
    .find((w) => w.id === tree.selectedWorkspaceId)
    ?.collections.find((c) => c.id === tree.selectedCollectionId)
  const selectedEnv = tree.environments.find((e) => e.id === tree.selectedEnvironmentId)

  const baseForExport = runningBaseUrl || lastKnownBaseUrl || ''

  const handleExportPostman = () => {
    if (!selectedCol) return
    const col = buildPostmanCollectionV21({
      collection: selectedCol,
      defaultMethod: tree.requestMethod,
      baseUrlDefault: baseForExport || 'http://127.0.0.1:0',
    })
    downloadJson(
      `${sanitizeFilename(selectedCol.name || 'collection')}.postman_collection.json`,
      col,
    )
  }

  const handleExportOpenApiJson = () => {
    if (!selectedCol) return
    const doc = buildOpenApiFromCollection({
      title: selectedCol.name || 'API',
      collection: selectedCol,
      defaultMethod: tree.requestMethod,
    })
    downloadJson(`${sanitizeFilename(selectedCol.name || 'openapi')}.openapi.json`, doc)
  }

  const handleExportOpenApiYaml = () => {
    if (!selectedCol) return
    const doc = buildOpenApiFromCollection({
      title: selectedCol.name || 'API',
      collection: selectedCol,
      defaultMethod: tree.requestMethod,
    })
    downloadTextFile(
      `${sanitizeFilename(selectedCol.name || 'openapi')}.openapi.yaml`,
      `${stringify(doc)}\n`,
      'application/yaml',
    )
  }

  const onPickImportFile = () => {
    setImportFeedback(null)
    fileRef.current?.click()
  }

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportFeedback(null)
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      try {
        parsed = parseYaml(text)
      } catch {
        setImportFeedback({
          kind: 'error',
          text: 'Could not parse file as JSON or YAML.',
        })
        return
      }
    }
    const result = importOpenApiSubset(parsed)
    if (!result.ok) {
      setImportFeedback({ kind: 'error', text: result.error })
      return
    }
    const ws = tree.workspaces.find((w) => w.id === tree.selectedWorkspaceId)
    const col = ws?.collections.find((c) => c.id === tree.selectedCollectionId)
    if (!ws || !col) {
      setImportFeedback({ kind: 'error', text: 'No collection selected.' })
      return
    }
    const merged = [...col.endpoints, ...result.endpoints]
    const v = validateEndpointsConfig(merged, tree.requestMethod)
    if (!v.ok) {
      setImportFeedback({ kind: 'error', text: v.error })
      return
    }
    setTree((t) => {
      const ws2 = t.workspaces.find((w) => w.id === t.selectedWorkspaceId)
      const col2 = ws2?.collections.find((c) => c.id === t.selectedCollectionId)
      if (!ws2 || !col2) return t
      return {
        ...t,
        workspaces: t.workspaces.map((w) =>
          w.id !== ws2.id
            ? w
            : {
                ...w,
                collections: w.collections.map((c) =>
                  c.id === col2.id
                    ? { ...c, endpoints: [...c.endpoints, ...result.endpoints] }
                    : c,
                ),
              },
        ),
        selectedRouteIndex: col2.endpoints.length,
      }
    })
    setImportFeedback({
      kind: 'success',
      text: `Imported ${result.endpoints.length} route${result.endpoints.length === 1 ? '' : 's'}.`,
    })
  }

  return (
    <section className="pm-overview">
      <h2 className="pm-overview__title">Import, export &amp; environments</h2>
      <p className="pm-overview__lead">
        Switch environments in the server bar above. Use <code>{'{{name}}'}</code> in path segments; set
        values here or add <code>baseUrl</code> for Postman/OpenAPI exports.
      </p>
      <div className="pm-overview__block">
        <h3 className="pm-overview__h">Environments</h3>
        <p className="pm-overview__p">
          Variables substitute <code>{'{{name}}'}</code> in route path segments. Set <code>baseUrl</code> for
          Postman/OpenAPI exports.
        </p>
        <div className="pm-overview__row">
          <label className="pm-overview__label">
            Active
            <select
              className="pm-sidebar__select"
              value={tree.selectedEnvironmentId}
              onChange={(e) => setTree((t) => setSelectedEnvironment(t, e.target.value))}
            >
              {tree.environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pm-sidebar__toolbar-btn"
            disabled={tree.environments.length >= MAX_ENVIRONMENTS}
            onClick={() => setTree((t) => addEnvironment(t))}
            aria-label={`Add environment (max ${MAX_ENVIRONMENTS})`}
          >
            + Environment
          </button>
        </div>
        {selectedEnv && (
          <>
            <label className="pm-overview__label pm-overview__label--full">
              Name
              <input
                className="pm-input"
                value={selectedEnv.name}
                onChange={(e) =>
                  setTree((t) => setEnvironmentNameForId(t, selectedEnv.id, e.target.value))
                }
              />
            </label>
            <div className="pm-overview__vars">
              {Object.entries(selectedEnv.variables).map(([k, v]) => (
                <div key={k} className="pm-overview__var-row">
                  <code className="pm-overview__var-key">{k}</code>
                  <input
                    className="pm-input"
                    value={v}
                    onChange={(e) =>
                      setTree((t) =>
                        setEnvironmentVariable(t, selectedEnv.id, k, e.target.value),
                      )
                    }
                    aria-label={`Value for ${k}`}
                  />
                </div>
              ))}
              <AddVarForm
                onAdd={(key, value) =>
                  setTree((t) => setEnvironmentVariable(t, selectedEnv.id, key, value))
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="pm-overview__block">
        <h3 className="pm-overview__h">Export / import</h3>
        <p className="pm-overview__p">
          Exports use the <strong>selected collection</strong> and substitute environment variables
          (including <code>baseUrl</code> when the mock server has run).
        </p>
        <div className="pm-overview__btn-row">
          <button type="button" className="pm-sidebar__toolbar-btn" onClick={handleExportPostman}>
            Postman collection
          </button>
          <button type="button" className="pm-sidebar__toolbar-btn" onClick={handleExportOpenApiJson}>
            OpenAPI JSON
          </button>
          <button type="button" className="pm-sidebar__toolbar-btn" onClick={handleExportOpenApiYaml}>
            OpenAPI YAML
          </button>
        </div>
        <div className="pm-overview__btn-row">
          <button type="button" className="pm-sidebar__toolbar-btn" onClick={onPickImportFile}>
            Import OpenAPI
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.yaml,.yml,application/json"
            className="pm-sr-only"
            aria-hidden
            onChange={(e) => void onImportFile(e)}
          />
        </div>
        {importFeedback && (
          <div
            className={
              importFeedback.kind === 'error'
                ? 'pm-overview__import-msg pm-overview__import-msg--err'
                : 'pm-overview__import-msg pm-overview__import-msg--ok'
            }
            role={importFeedback.kind === 'error' ? 'alert' : 'status'}
          >
            {importFeedback.text}
            <button
              type="button"
              className="pm-overview__import-msg-dismiss"
              onClick={() => setImportFeedback(null)}
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <p>
        <strong>Sidebar:</strong> pick a <strong>workspace</strong> (saved group of routes), then open{' '}
        <strong>collection</strong> folders and select a <strong>request</strong> row. Each route can set
        its own HTTP method; new routes use the method from the request bar as default.{' '}
        <strong>+ Collection</strong> adds a folder; <strong>+ Request</strong> adds a path under the open
        collection.
      </p>
      <p>
        Mock endpoints support <strong>GET</strong> and <strong>HEAD</strong> with a <code>count</code>{' '}
        query (1–500) for list responses when using generated bodies; <strong>POST</strong> returns{' '}
        <code>201</code> with one generated object by default; <strong>PUT</strong>/<strong>PATCH</strong>{' '}
        return <code>200</code> with one object (optional JSON body is shallow-merged);{' '}
        <strong>DELETE</strong> returns <code>204</code>. Use <strong>Mock server behavior</strong> on the
        Response tab for delays, status overrides, and named examples. On the <strong>Response</strong>{' '}
        tab, use a <strong>field list</strong> or <strong>advanced</strong> JSON; start the
        server, choose a method, then <strong>Send</strong> to preview.
      </p>
      {Boolean(electron) && (
        <p className="pm-overview__persist">
          {persistDisabled ? (
            <>
              Local <strong>SQLite</strong> database is unavailable. Workspaces, routes, and settings are not
              saved between sessions.
            </>
          ) : (
            <>
              Workspaces, collections, environments, selected route, HTTP method, and <code>count</code> are
              saved automatically in a local <strong>SQLite</strong> database and restored when you reopen the
              desktop app.
            </>
          )}
        </p>
      )}
    </section>
  )
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'export'
}

function AddVarForm({ onAdd }: { onAdd: (key: string, value: string) => void }) {
  return (
    <form
      className="pm-overview__add-var"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const key = String(fd.get('key') ?? '').trim()
        const value = String(fd.get('value') ?? '')
        if (!key) return
        onAdd(key, value)
        e.currentTarget.reset()
      }}
    >
      <input name="key" className="pm-input" placeholder="variable name" aria-label="New variable name" />
      <input name="value" className="pm-input" placeholder="value" aria-label="New variable value" />
      <button type="submit" className="pm-sidebar__toolbar-btn">
        Add variable
      </button>
    </form>
  )
}

import type {
  EndpointConfig,
  EndpointExample,
  EndpointResponseMode,
  PersistedAppState,
  SchemaField,
  SchemaFieldType,
} from '../types'
import { FIELD_TYPES } from '../constants'
import { LazyJsonCodeEditor } from './LazyJsonCodeEditor'

export type ResponseDefinitionSectionProps = {
  tree: PersistedAppState
  selected: EndpointConfig
  running: boolean
  flatEndpoints: EndpointConfig[]
  responseMode: EndpointResponseMode
  exampleResponseError: string | null
  onUpdatePath: (path: string) => void
  onRemoveRoute: () => void
  onSetResponseMode: (mode: EndpointResponseMode) => void
  onUpdateSampleJson: (text: string) => void
  onUpdateField: (fieldIndex: number, patch: Partial<SchemaField>) => void
  onRemoveField: (fieldIndex: number) => void
  onAddField: () => void
  onUpdateMock: (patch: {
    delayMs?: number | undefined
    httpStatus?: number | undefined
    responseSource?: 'generated' | 'example'
    activeExampleIndex?: number
    examples?: EndpointExample[]
  }) => void
}

export function ResponseDefinitionSection({
  tree,
  selected,
  running,
  flatEndpoints,
  responseMode,
  exampleResponseError,
  onUpdatePath,
  onRemoveRoute,
  onSetResponseMode,
  onUpdateSampleJson,
  onUpdateField,
  onRemoveField,
  onAddField,
  onUpdateMock,
}: ResponseDefinitionSectionProps) {
  return (
    <section className="pm-schema" aria-label="Response definition">
      <div className="pm-schema__head">
        <label className="pm-schema__path-label" htmlFor="pm-schema-path-segment">
          Path segment
        </label>
        <div className="pm-schema__path-row">
          <span className="pm-schema__slash">/</span>
          <input
            id="pm-schema-path-segment"
            className="pm-input pm-input--path"
            value={selected.path}
            onChange={(e) => onUpdatePath(e.target.value)}
            placeholder="users"
            disabled={running}
          />
          {flatEndpoints.length > 1 && (
            <button
              type="button"
              className="pm-btn pm-btn--danger-ghost"
              disabled={running}
              onClick={() => onRemoveRoute()}
              aria-label="Delete this mock route"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="pm-schema__mock">
        <span className="pm-schema__path-label">Mock server behavior</span>
        <div className="pm-schema__mock-row">
          <label className="pm-schema__mini">
            Delay (ms)
            <input
              type="number"
              className="pm-input pm-input--narrow"
              min={0}
              max={120000}
              value={selected.delayMs ?? ''}
              placeholder="0"
              disabled={running}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === '') {
                  onUpdateMock({ delayMs: undefined })
                  return
                }
                const n = Number(v)
                onUpdateMock({ delayMs: Number.isFinite(n) ? n : undefined })
              }}
            />
          </label>
          <label className="pm-schema__mini">
            HTTP status
            <input
              type="number"
              className="pm-input pm-input--narrow"
              min={100}
              max={599}
              value={selected.httpStatus ?? ''}
              placeholder="auto"
              disabled={running}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === '') {
                  onUpdateMock({ httpStatus: undefined })
                  return
                }
                const n = Number(v)
                onUpdateMock({ httpStatus: Number.isFinite(n) ? n : undefined })
              }}
            />
          </label>
          <label className="pm-schema__mini">
            Body source
            <select
              className="pm-select"
              value={selected.responseSource === 'example' ? 'example' : 'generated'}
              disabled={running}
              onChange={(e) => {
                const useNamed = e.target.value === 'example'
                if (!useNamed) {
                  onUpdateMock({ responseSource: 'generated' })
                  return
                }
                const hasExamples = (selected.examples?.length ?? 0) > 0
                onUpdateMock(
                  hasExamples
                    ? { responseSource: 'example' }
                    : {
                        responseSource: 'example',
                        examples: [{ name: 'Example 1', body: '{}' }],
                        activeExampleIndex: 0,
                      },
                )
              }}
            >
              <option value="generated">Generated from schema / example</option>
              <option value="example">Named example only</option>
            </select>
          </label>
        </div>
        {selected.responseSource === 'example' && (
          <div className="pm-schema__examples">
            <div className="pm-schema__examples-head">
              <span>Named examples</span>
              <button
                type="button"
                className="pm-link"
                disabled={running}
                onClick={() => {
                  const ex = selected.examples ?? []
                  onUpdateMock({
                    examples: [
                      ...ex,
                      { name: `Example ${ex.length + 1}`, body: '{}' },
                    ],
                    activeExampleIndex: ex.length,
                  })
                }}
              >
                + Add example
              </button>
            </div>
            {(selected.examples ?? []).map((ex, i) => (
              <div key={`${ex.name}-${i}`} className="pm-schema__example-block">
                <div className="pm-schema__example-row">
                  <label className="pm-schema__mini">
                    Name
                    <input
                      className="pm-input"
                      value={ex.name}
                      disabled={running}
                      onChange={(e) => {
                        const next = [...(selected.examples ?? [])]
                        next[i] = { ...ex, name: e.target.value }
                        onUpdateMock({ examples: next })
                      }}
                    />
                  </label>
                  <label className="pm-schema__mini pm-schema__radio">
                    <input
                      type="radio"
                      name="active-example"
                      checked={(selected.activeExampleIndex ?? 0) === i}
                      disabled={running}
                      onChange={() => onUpdateMock({ activeExampleIndex: i })}
                    />
                    Active
                  </label>
                </div>
                <LazyJsonCodeEditor
                  compact
                  value={ex.body}
                  disabled={running}
                  onChange={(v) => {
                    const next = [...(selected.examples ?? [])]
                    next[i] = { ...ex, body: v }
                    onUpdateMock({ examples: next })
                  }}
                />
              </div>
            ))}
            {(selected.examples ?? []).length === 0 && (
              <p className="pm-schema__mode-hint">Add at least one named example with JSON body.</p>
            )}
          </div>
        )}
      </div>

      <div className="pm-schema__mode">
        <span className="pm-schema__path-label">How to define the response</span>
        <div className="pm-schema__mode-row" role="group" aria-label="Response definition mode">
          <button
            type="button"
            className={`pm-mode-btn ${responseMode === 'schema' ? 'pm-mode-btn--active' : ''}`}
            disabled={running}
            onClick={() => onSetResponseMode('schema')}
            aria-pressed={responseMode === 'schema'}
          >
            Field list
          </button>
          <button
            type="button"
            className={`pm-mode-btn ${responseMode === 'sampleJson' ? 'pm-mode-btn--active' : ''}`}
            disabled={running}
            onClick={() => onSetResponseMode('sampleJson')}
            aria-pressed={responseMode === 'sampleJson'}
          >
            Advanced
          </button>
        </div>
        <p className="pm-schema__mode-hint">
          {responseMode === 'schema'
            ? 'The field list and advanced JSON stay in sync for flat objects (primitive values only). Nested objects or arrays in JSON do not update the table.'
            : 'Flat objects sync to the field list automatically. Nested shapes only apply in this editor — they do not update the table.'}
        </p>
      </div>

      {responseMode === 'sampleJson' && (
        <div
          className="pm-example-response"
          role="group"
          aria-labelledby={`advanced-json-label-${tree.selectedCollectionId}-${tree.selectedRouteIndex}`}
        >
          <span
            id={`advanced-json-label-${tree.selectedCollectionId}-${tree.selectedRouteIndex}`}
            className="pm-example-response__label"
          >
            Response body (JSON)
          </span>
          <LazyJsonCodeEditor
            key={`advanced-json-${tree.selectedCollectionId}-${tree.selectedRouteIndex}`}
            value={selected.sampleJson ?? ''}
            onChange={onUpdateSampleJson}
            disabled={running}
            hasError={Boolean(exampleResponseError)}
            aria-labelledby={`advanced-json-label-${tree.selectedCollectionId}-${tree.selectedRouteIndex}`}
            aria-invalid={Boolean(exampleResponseError)}
            aria-describedby={exampleResponseError ? 'advanced-json-error' : undefined}
          />
          {exampleResponseError && (
            <p id="advanced-json-error" className="pm-example-response__error" role="alert">
              {exampleResponseError}
            </p>
          )}
        </div>
      )}

      {responseMode === 'schema' && (
        <>
          <table className="pm-table">
            <caption className="pm-sr-only">Response field definitions</caption>
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Type</th>
                <th className="pm-table__narrow" scope="col">
                  <span className="pm-sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.schema.map((field, fi) => (
                <tr key={`${field.name}-${fi}`}>
                  <td>
                    <input
                      className="pm-input"
                      value={field.name}
                      onChange={(e) => onUpdateField(fi, { name: e.target.value })}
                      disabled={running}
                    />
                  </td>
                  <td>
                    <select
                      className="pm-select"
                      value={field.type}
                      onChange={(e) =>
                        onUpdateField(fi, {
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
                      onClick={() => onRemoveField(fi)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="pm-link" disabled={running} onClick={() => onAddField()}>
            + Add field
          </button>
        </>
      )}
    </section>
  )
}

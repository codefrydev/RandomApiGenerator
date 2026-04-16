import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { HTTP_METHODS, type HttpMethod, type PersistedAppState } from '../types'
import { useQueryApiClient } from '../hooks/useQueryApiClient'
import { useTabListKeyboard } from '../hooks/useTabListKeyboard'
import { OverviewSection } from './OverviewSection'
import { RequestCodeSamples } from './RequestCodeSamples'
import { ResponseViewer } from './ResponseViewer'
import { LazyJsonCodeEditor } from './LazyJsonCodeEditor'

type ElectronApi = NonNullable<Window['electronAPI']>

const QUERY_MAIN_TAB_IDS = ['query-tab-request', 'query-tab-import'] as const
const QUERY_SUBTAB_IDS = ['query-subtab-response', 'query-subtab-code'] as const

export type QueryMainTab = 'request' | 'import'

export type QueryApiWorkspaceProps = {
  electron: ElectronApi | undefined
  tree: PersistedAppState
  setTree: Dispatch<SetStateAction<PersistedAppState>>
  persistDisabled: boolean
  lastKnownBaseUrl: string
  runningBaseUrl: string
  mainTab: QueryMainTab
  onMainTabChange: (tab: QueryMainTab) => void
}

export function QueryApiWorkspace({
  electron,
  tree,
  setTree,
  persistDisabled,
  lastKnownBaseUrl,
  runningBaseUrl,
  mainTab,
  onMainTabChange,
}: QueryApiWorkspaceProps) {
  const q = useQueryApiClient()
  const [showCode, setShowCode] = useState(false)

  const sendDisabled = !q.url.trim()

  let sendTitle = `Send HTTP ${q.method} request`
  if (!q.url.trim()) {
    sendTitle = 'Enter a full http(s) URL'
  }

  const mainTabIdx = mainTab === 'request' ? 0 : 1
  const { onKeyDown: onQueryMainTabsKeyDown, tabIndexFor: queryMainTabIndexFor } = useTabListKeyboard({
    tabCount: 2,
    selectedIndex: mainTabIdx,
    onSelectIndex: (i) => onMainTabChange(i === 0 ? 'request' : 'import'),
    tabIds: QUERY_MAIN_TAB_IDS,
  })

  const subTabIdx = showCode ? 1 : 0
  const { onKeyDown: onQuerySubTabsKeyDown, tabIndexFor: querySubTabIndexFor } = useTabListKeyboard({
    tabCount: 2,
    selectedIndex: subTabIdx,
    onSelectIndex: (i) => setShowCode(i === 1),
    tabIds: QUERY_SUBTAB_IDS,
  })

  return (
    <>
      <div
        className="pm-tabs"
        role="tablist"
        aria-label="Query API sections"
        tabIndex={-1}
        onKeyDown={onQueryMainTabsKeyDown}
      >
        <button
          type="button"
          role="tab"
          id="query-tab-request"
          tabIndex={queryMainTabIndexFor(0)}
          aria-selected={mainTab === 'request'}
          className={`pm-tab ${mainTab === 'request' ? 'pm-tab--active' : ''}`}
          onClick={() => onMainTabChange('request')}
        >
          Request
        </button>
        <button
          type="button"
          role="tab"
          id="query-tab-import"
          tabIndex={queryMainTabIndexFor(1)}
          aria-selected={mainTab === 'import'}
          className={`pm-tab ${mainTab === 'import' ? 'pm-tab--active' : ''}`}
          onClick={() => onMainTabChange('import')}
        >
          Import &amp; env
        </button>
      </div>

      {mainTab === 'import' ? (
        <div role="tabpanel" id="query-panel-import" aria-labelledby="query-tab-import">
          <OverviewSection
            tree={tree}
            setTree={setTree}
            electron={electron}
            persistDisabled={persistDisabled}
            lastKnownBaseUrl={lastKnownBaseUrl}
            runningBaseUrl={runningBaseUrl}
          />
        </div>
      ) : (
        <div role="tabpanel" id="query-panel-request" aria-labelledby="query-tab-request">
          <section className="pm-request pm-request--query-api" aria-label="HTTP client">
            <p className="pm-request__hint pm-request__hint--muted">
              <strong>Query API</strong> — send any http(s) URL. Use <strong>Import &amp; env</strong> above for
              OpenAPI import, collection export, and variables. Switch to <strong>Gen API</strong> in the sidebar
              to run the local mock server and edit response schemas.
            </p>

            <div className="pm-request__row">
              <label className="pm-request__method" title="HTTP method">
                <span className="pm-sr-only">HTTP method</span>
                <select
                  className="pm-request__method-select"
                  value={q.method}
                  onChange={(e) => {
                    q.resetResponse()
                    q.setMethod(e.target.value as HttpMethod)
                  }}
                  aria-label="HTTP method"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <div className="pm-request__url-wrap">
                <input
                  className="pm-request__url"
                  value={q.url}
                  onChange={(e) => {
                    q.resetResponse()
                    q.setUrl(e.target.value)
                  }}
                  placeholder="https://api.example.com/v1/resource"
                  spellCheck={false}
                  aria-label="Full URL for request"
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                className="pm-btn pm-btn--send"
                disabled={sendDisabled}
                title={sendTitle}
                onClick={() => void q.send()}
                aria-label={sendTitle}
              >
                Send
              </button>
            </div>

            <p className="pm-request__hint pm-request__hint--muted">
              Requests use <code>fetch</code> from this window. In the browser, other origins may fail with CORS
              unless they allow your origin; the desktop app has the same limits for cross-origin calls.
            </p>

            {q.showBody && (
              <div
                className="pm-request__body"
                role="group"
                aria-labelledby="pm-query-api-body-label"
              >
                <span id="pm-query-api-body-label" className="pm-request__body-label">
                  Body (JSON)
                </span>
                <LazyJsonCodeEditor
                  compact
                  value={q.requestBody}
                  onChange={q.setRequestBody}
                  placeholder="Optional JSON body (POST, PUT, PATCH)"
                  aria-labelledby="pm-query-api-body-label"
                />
              </div>
            )}

            <div
              className="pm-tabs pm-tabs--inline"
              role="tablist"
              aria-label="Response or code sample"
              tabIndex={-1}
              onKeyDown={onQuerySubTabsKeyDown}
            >
              <button
                type="button"
                role="tab"
                id="query-subtab-response"
                tabIndex={querySubTabIndexFor(0)}
                aria-selected={!showCode}
                className={`pm-tab ${!showCode ? 'pm-tab--active' : ''}`}
                onClick={() => setShowCode(false)}
              >
                Response
              </button>
              <button
                type="button"
                role="tab"
                id="query-subtab-code"
                tabIndex={querySubTabIndexFor(1)}
                aria-selected={showCode}
                className={`pm-tab ${showCode ? 'pm-tab--active' : ''}`}
                onClick={() => setShowCode(true)}
              >
                Code
              </button>
            </div>

            <div
              role="tabpanel"
              id="query-panel-response"
              className="pm-query-tabpanel pm-query-tabpanel--response"
              aria-labelledby="query-subtab-response"
              hidden={showCode}
            >
              {!showCode ? (
                <ResponseViewer
                  fetchError={q.fetchError}
                  preview={q.preview}
                  rawBody={q.rawBody}
                  bodyView={q.bodyView}
                  responseMeta={q.responseMeta}
                  onBodyViewChange={q.setBodyView}
                  emptyVariant="queryApi"
                />
              ) : null}
            </div>

            <div
              role="tabpanel"
              id="query-panel-code"
              className="pm-query-tabpanel pm-query-tabpanel--code"
              aria-labelledby="query-subtab-code"
              hidden={!showCode}
            >
              {showCode ? <RequestCodeSamples spec={q.codeSpec} /> : null}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

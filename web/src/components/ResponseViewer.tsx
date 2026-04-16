import { lazy, Suspense } from 'react'
import { useTabListKeyboard } from '../hooks/useTabListKeyboard'
import type { ResponseMeta } from '../types'
import { formatBytes } from '../lib/formatBytes'
import { inferResponseBodyLanguage } from '../lib/inferResponseBodyLanguage'

const CodeMirrorReadonly = lazy(async () => {
  const m = await import('./CodeMirrorReadonly')
  return { default: m.CodeMirrorReadonly }
})

const RESPONSE_BODY_TAB_IDS = ['pm-response-body-pretty', 'pm-response-body-raw'] as const

export type ResponseEmptyVariant = 'genApi' | 'queryApi'

export type ResponseViewerProps = {
  fetchError: string
  preview: string
  rawBody: string
  bodyView: 'pretty' | 'raw'
  responseMeta: ResponseMeta | null
  onBodyViewChange: (v: 'pretty' | 'raw') => void
  /** Hint text when there is no response yet (Gen API vs Query API). */
  emptyVariant?: ResponseEmptyVariant
}

const EMPTY_HINT: Record<ResponseEmptyVariant, string> = {
  genApi: 'Start the server, then use Send to preview the JSON response body here.',
  queryApi: 'Enter a URL and use Send to preview the response body here.',
}

export function ResponseViewer({
  fetchError,
  preview,
  rawBody,
  bodyView,
  responseMeta,
  onBodyViewChange,
  emptyVariant = 'genApi',
}: ResponseViewerProps) {
  const emptyHint = EMPTY_HINT[emptyVariant]

  const bodyTabIdx = bodyView === 'pretty' ? 0 : 1
  const { onKeyDown: onBodyTabsKeyDown, tabIndexFor: bodyTabIndexFor } = useTabListKeyboard({
    tabCount: 2,
    selectedIndex: bodyTabIdx,
    onSelectIndex: (i) => onBodyViewChange(i === 0 ? 'pretty' : 'raw'),
    tabIds: RESPONSE_BODY_TAB_IDS,
  })

  return (
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
              <span className="pm-chip pm-chip--muted">{formatBytes(responseMeta.sizeBytes)}</span>
            </>
          )}
        </div>
        <div
          className="pm-response__tabs"
          role="tablist"
          aria-label="Response body format"
          tabIndex={-1}
          onKeyDown={onBodyTabsKeyDown}
        >
          <button
            type="button"
            role="tab"
            id="pm-response-body-pretty"
            tabIndex={bodyTabIndexFor(0)}
            aria-selected={bodyView === 'pretty'}
            className={`pm-subtab ${bodyView === 'pretty' ? 'pm-subtab--active' : ''}`}
            onClick={() => onBodyViewChange('pretty')}
          >
            Pretty
          </button>
          <button
            type="button"
            role="tab"
            id="pm-response-body-raw"
            tabIndex={bodyTabIndexFor(1)}
            aria-selected={bodyView === 'raw'}
            className={`pm-subtab ${bodyView === 'raw' ? 'pm-subtab--active' : ''}`}
            onClick={() => onBodyViewChange('raw')}
          >
            Raw
          </button>
        </div>
      </div>
      <div className="pm-response__body">
        {fetchError && (
          <p className="pm-response__fetch-err" role="alert">
            {fetchError}
          </p>
        )}
        {preview && (
          <Suspense
            fallback={
              <pre className="pm-code">{bodyView === 'pretty' ? preview : rawBody}</pre>
            }
          >
            <CodeMirrorReadonly
              key={`${bodyView}-${preview.length}-${rawBody.length}`}
              value={bodyView === 'pretty' ? preview : rawBody}
              language={inferResponseBodyLanguage(bodyView === 'pretty' ? preview : rawBody)}
              aria-label={bodyView === 'pretty' ? 'Response body, formatted' : 'Response body, raw'}
            />
          </Suspense>
        )}
        {!preview && !fetchError && (
          <div className="pm-response__empty">
            <p className="pm-response__empty-title">No response yet</p>
            <p className="pm-response__empty-hint">{emptyHint}</p>
          </div>
        )}
      </div>
    </section>
  )
}

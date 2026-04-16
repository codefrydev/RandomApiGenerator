import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { buildCodeSamples, type RequestCodeSpec } from '../lib/requestCodeSamples'
import { useTabListKeyboard } from '../hooks/useTabListKeyboard'

const CodeSamplesMirror = lazy(async () => {
  const m = await import('./CodeSamplesMirror')
  return { default: m.CodeSamplesMirror }
})

type CodeTab = 'curl' | 'python' | 'csharp'

const CODE_LANG_TAB_IDS = ['code-samples-lang-curl', 'code-samples-lang-python', 'code-samples-lang-csharp'] as const

export type RequestCodeSamplesProps = {
  spec: RequestCodeSpec
}

export function RequestCodeSamples({ spec }: RequestCodeSamplesProps) {
  const [lang, setLang] = useState<CodeTab>('curl')
  const [copyHint, setCopyHint] = useState('')

  const samples = useMemo(() => buildCodeSamples(spec), [spec])

  const activeText =
    lang === 'curl' ? samples.curl : lang === 'python' ? samples.python : samples.csharp

  const langIdx = lang === 'curl' ? 0 : lang === 'python' ? 1 : 2
  const { onKeyDown: onLangTabsKeyDown, tabIndexFor: langTabIndexFor } = useTabListKeyboard({
    tabCount: 3,
    selectedIndex: langIdx,
    onSelectIndex: (i) => setLang(i === 0 ? 'curl' : i === 1 ? 'python' : 'csharp'),
    tabIds: CODE_LANG_TAB_IDS,
  })

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeText)
      setCopyHint('Copied')
      window.setTimeout(() => setCopyHint(''), 2000)
    } catch {
      setCopyHint('Copy failed')
      window.setTimeout(() => setCopyHint(''), 3000)
    }
  }, [activeText])

  return (
    <section className="pm-code-samples" aria-label="Code samples">
      <p className="pm-code-samples__intro">
        Matches <strong>Send</strong> (mock route or custom URL), method, and body — copy into your project or
        terminal.
      </p>
      <div className="pm-code-samples__toolbar">
        <div
          className="pm-code-samples__langs"
          role="tablist"
          aria-label="Code sample language"
          tabIndex={-1}
          onKeyDown={onLangTabsKeyDown}
        >
          <button
            type="button"
            role="tab"
            id="code-samples-lang-curl"
            tabIndex={langTabIndexFor(0)}
            aria-selected={lang === 'curl'}
            className={`pm-mode-btn ${lang === 'curl' ? 'pm-mode-btn--active' : ''}`}
            onClick={() => setLang('curl')}
          >
            cURL
          </button>
          <button
            type="button"
            role="tab"
            id="code-samples-lang-python"
            tabIndex={langTabIndexFor(1)}
            aria-selected={lang === 'python'}
            className={`pm-mode-btn ${lang === 'python' ? 'pm-mode-btn--active' : ''}`}
            onClick={() => setLang('python')}
          >
            Python
          </button>
          <button
            type="button"
            role="tab"
            id="code-samples-lang-csharp"
            tabIndex={langTabIndexFor(2)}
            aria-selected={lang === 'csharp'}
            className={`pm-mode-btn ${lang === 'csharp' ? 'pm-mode-btn--active' : ''}`}
            onClick={() => setLang('csharp')}
          >
            C#
          </button>
        </div>
        <div className="pm-code-samples__copy-wrap">
          <button type="button" className="pm-btn pm-btn--ghost" onClick={() => void onCopy()}>
            Copy
          </button>
          <span className="pm-code-samples__hint" aria-live="polite">
            {copyHint}
          </span>
        </div>
      </div>
      <Suspense
        fallback={
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable overflow region
          <pre className="pm-code-samples__pre" tabIndex={0}>
            {activeText}
          </pre>
        }
      >
        <CodeSamplesMirror
          key={lang}
          value={activeText}
          lang={lang}
        />
      </Suspense>
    </section>
  )
}

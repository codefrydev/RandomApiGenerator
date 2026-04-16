import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { useMemo } from 'react'

export type CodeMirrorReadonlyProps = {
  value: string
  /** JSON uses Lezer highlighting; plain is for non-JSON bodies and placeholders. */
  language: 'json' | 'plain'
  'aria-label'?: string
}

/** Read-only CodeMirror: line numbers, folding, highlighting (JSON), search. Matches response panel dark code surface. */
export function CodeMirrorReadonly({ value, language, ...aria }: CodeMirrorReadonlyProps) {
  const extensions = useMemo(() => {
    const lang = language === 'json' ? [json()] : []
    return [
      ...lang,
      oneDark,
      EditorView.theme(
        {
          '&': {
            backgroundColor: 'var(--code-bg)',
          },
          '.cm-gutters': {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            borderRight: '1px solid rgba(148, 163, 184, 0.2)',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
        },
        { dark: true },
      ),
      EditorView.lineWrapping,
    ]
  }, [language])

  return (
    <div className="pm-code-cm">
      <CodeMirror
        value={value}
        extensions={extensions}
        theme="none"
        readOnly
        editable={false}
        minHeight="200px"
        maxHeight="min(65vh, 560px)"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          foldKeymap: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          highlightSelectionMatches: true,
          autocompletion: false,
          searchKeymap: true,
        }}
        {...aria}
      />
    </div>
  )
}

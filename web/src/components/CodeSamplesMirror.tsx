import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { EditorView } from '@codemirror/view'
import { useMemo } from 'react'
import { pmCodeSampleTheme } from '../lib/codemirror/pmJsonTheme'

export type CodeSampleLang = 'curl' | 'python' | 'csharp'

function langExtension(lang: CodeSampleLang) {
  if (lang === 'curl') return StreamLanguage.define(shell)
  if (lang === 'python') return python()
  return javascript({ typescript: true })
}

export type CodeSamplesMirrorProps = {
  value: string
  lang: CodeSampleLang
}

/** Read-only shell / Python / C# highlighting for generated request samples. */
export function CodeSamplesMirror({ value, lang }: CodeSamplesMirrorProps) {
  const extensions = useMemo(
    () => [langExtension(lang), EditorView.lineWrapping, pmCodeSampleTheme()],
    [lang],
  )

  return (
    <div className="pm-code-samples__cm">
      <CodeMirror
        value={value}
        extensions={extensions}
        theme="light"
        readOnly
        editable={false}
        minHeight="120px"
        maxHeight="min(40vh, 280px)"
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
        aria-label={`${lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : 'C#'} code sample`}
      />
    </div>
  )
}

import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { useMemo } from 'react'
import { pmJsonTheme } from '../lib/codemirror/pmJsonTheme'

export type JsonCodeEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hasError?: boolean
  /** Shorter editor for nested fields (e.g. named examples). */
  compact?: boolean
  placeholder?: string
  'aria-labelledby'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string | undefined
}

/** JSON editor with syntax highlighting, line numbers, folding, and soft wrap. */
export function JsonCodeEditor({
  value,
  onChange,
  disabled = false,
  hasError = false,
  compact = false,
  placeholder: placeholderText,
  ...aria
}: JsonCodeEditorProps) {
  const extensions = useMemo(() => [json(), EditorView.lineWrapping, pmJsonTheme()], [])

  return (
    <div className={`pm-json-editor${hasError ? ' pm-json-editor--err' : ''}`}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        placeholder={placeholderText}
        minHeight={compact ? '120px' : '200px'}
        maxHeight={compact ? 'min(40vh, 320px)' : 'min(55vh, 480px)'}
        theme="light"
        readOnly={disabled}
        editable={!disabled}
        indentWithTab
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

import { lazy, Suspense } from 'react'
import type { JsonCodeEditorProps } from './JsonCodeEditor'

const JsonCodeEditor = lazy(async () => {
  const m = await import('./JsonCodeEditor')
  return { default: m.JsonCodeEditor }
})

export type LazyJsonCodeEditorProps = JsonCodeEditorProps

/** Lazy-loaded JSON CodeMirror with textarea fallback while the chunk loads. */
export function LazyJsonCodeEditor(props: LazyJsonCodeEditorProps) {
  return (
    <Suspense
      fallback={
        <textarea
          className={`pm-textarea${props.compact ? ' pm-textarea--compact' : ''}${props.hasError ? ' pm-textarea--err' : ''}`}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          disabled={props.disabled}
          spellCheck={false}
          rows={props.compact ? 5 : 14}
          placeholder={props.placeholder}
          aria-labelledby={props['aria-labelledby']}
          aria-invalid={props['aria-invalid']}
          aria-describedby={props['aria-describedby']}
        />
      }
    >
      <JsonCodeEditor {...props} />
    </Suspense>
  )
}

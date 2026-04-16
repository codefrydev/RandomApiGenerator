import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/** Theme layer for editable JSON fields (forms / Advanced mode). */
export function pmJsonTheme(): Extension {
  return EditorView.theme(
    {
      '&': {
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        backgroundColor: 'var(--color-bg-surface)',
      },
      '.cm-content': {
        padding: '10px 0',
        minHeight: '180px',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--color-bg-muted)',
        border: 'none',
        borderRight: '1px solid var(--color-border)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 10px 0 8px',
        minWidth: '2.25rem',
        color: 'var(--color-text-muted)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--color-bg-muted)',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(37, 99, 235, 0.06)',
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        color: 'var(--color-text-muted)',
      },
    },
    { dark: false },
  )
}

/** Light theme for multiline code samples panel (muted background). */
export function pmCodeSampleTheme(): Extension {
  return EditorView.theme(
    {
      '&': {
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        backgroundColor: 'var(--color-bg-muted)',
        color: 'var(--color-text-strong)',
      },
      '.cm-content': {
        padding: '10px 0',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--color-bg-surface)',
        border: 'none',
        borderRight: '1px solid var(--color-border)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 6px',
        minWidth: '2rem',
        color: 'var(--color-text-muted)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--color-bg-surface)',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(37, 99, 235, 0.06)',
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        color: 'var(--color-text-muted)',
      },
    },
    { dark: false },
  )
}

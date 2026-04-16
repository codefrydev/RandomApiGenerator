/** Whether the response body can be edited as JSON in CodeMirror (syntax + folding). */
export function inferResponseBodyLanguage(text: string): 'json' | 'plain' {
  const t = text.trim()
  if (!t) return 'plain'
  if (t.startsWith('(')) return 'plain'
  try {
    JSON.parse(t)
    return 'json'
  } catch {
    return 'plain'
  }
}
